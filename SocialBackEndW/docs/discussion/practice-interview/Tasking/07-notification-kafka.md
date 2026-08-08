# Notification, Email, Kafka và Background Processing

Baseline có Kafka producer/consumer, welcome/reset/article events, SMTP OAuth2, MySQL notification và SignalR push. Các task đi từ notification UX đến delivery semantics, outbox/inbox, retry/DLQ và production operations.

### [EVT-01] Envelope v2 có identity, version và trace

**L2→L3 · DST/OBS · EventId, SchemaVersion, CorrelationId, CausationId · 3 hướng · `IntegrationEventEnvelope`**

**Bối cảnh:** envelope thiếu identity/version nên khó dedupe/trace/evolve. **Invariant:** consumer v1/v2 cùng chạy khi rolling deploy; metadata không phụ thuộc payload model.

**Task:** contract v2, headers/payload decision, compatibility tests.

<details><summary>3 hướng</summary>

A add optional fields backward-compatible trong JSON. B infra metadata ở Kafka headers, business envelope payload. C schema registry + Avro/Protobuf khi governance cần. EventId stable across retry; correlation từ HTTP, causation là command/event cha; occurred time không dùng làm ordering truth. Unknown event/version phải route rõ, không silently commit.
</details>

<details><summary>Thinking/test</summary>

Junior add Guid; Middle versioned deserializer/compatibility; Senior schema ownership, deprecation, PII and replay. Golden payload tests old producer/new consumer and reverse compatibility.
</details>

### [EVT-02] Notification pagination và unread filter

**L2→L3 · DAT/PRF · keyset cursor, projection, unread index · 3 hướng · repository/controller/hub**

**Bối cảnh:** get toàn bộ notification không scale. **Invariant:** stable order, recipient-only, no duplicate when new events arrive.

**Task:** cursor `(CreatedAtUtc,Id)`, limit cap, unread/type filters and execution plan.

<details><summary>3 options</summary>

A offset for small/admin. B keyset recommended. C archive old partitions/table later. Project DTO, don't track entities. Index must follow predicates `(RecipientUserId, IsRead?, CreatedAtUtc, Id)`; measure selectivity before maintaining multiple variants. Cursor opaque/versioned.
</details>

<details><summary>Thinking/DoD</summary>

Junior page/size; Middle keyset/index/auth; Senior retention, archive, unread selectivity, API evolution and p99. Test inserts between pages and 100k rows/user.
</details>

### [EVT-03] Mark-as-read và unread counter concurrent-safe

**L3 · CON/DAT · idempotent bulk update, affected rows, monotonic counter · 3 hướng**

**Bối cảnh:** multiple tabs mark same IDs; counter must not go negative. **Invariant:** only recipient rows mutate; repeated request same result; decrement only newly changed rows.

**Task:** atomic bulk update and count strategy.

<details><summary>3 hướng</summary>

A count unread on read—correct, query cost. B `UPDATE ... WHERE IsRead=false`, use affected rows to decrement transactional materialized counter. C Redis counter with DB truth + reconciliation. For large ID list chunk/TVP/provider limits; validate ownership inside update predicate, not preloaded list only.
</details>

<details><summary>Thinking/test</summary>

Junior foreach entity; Middle set-based/idempotent/affected rows; Senior DB/cache consistency, event to UI, reconciliation and multiple-device ordering. Barrier two identical bulk calls; count correct.
</details>

### [EVT-04] Persist notification tách khỏi realtime push

**L3 · DST/RES · durable source, best-effort delivery, outbox · 3 hướng · `InAppNotificationService`**

**Bối cảnh:** DB save succeeds but SignalR fails; retry whole method may duplicate DB row. **Invariant:** DB notification durable/unique; push failure doesn't lie about persistence; reconnect fetch recovers.

**Task:** choose delivery SLA and refactor boundary.

<details><summary>3 approaches</summary>

A save then catch/log push; simple, realtime can miss. B enqueue in-memory after save; still lost on restart. C outbox `NotificationCreated` with worker push; durable/retry. Notification has business dedupe key/event ID unique. Realtime event carries notification ID; client dedupe then refresh unread/list if gap.
</details>

<details><summary>Thinking/test</summary>

Junior try/catch; Middle DB source + idempotency; Senior delivery SLO, reconnect protocol, queue lag and replay. Inject hub disconnect/process crash after commit.
</details>

### [EVT-05] Notification preference theo type/channel/quiet hours

**L3 · DAT/SEC · preference matrix, mandatory security mail, timezone · 3 hướng**

**Bối cảnh:** user wants in-app but no email for new article; security messages cannot opt out. **Invariant:** preference snapshot/effective policy consistent, consent/audit for marketing.

**Task:** data model, API, evaluation location and cache.

<details><summary>3 models</summary>

A booleans JSON on User; fast start, migration/query harder. B normalized `(User,EventType,Channel)` rows with defaults. C preference service/projection cache. Classify transactional/security/social/marketing; quiet hours needs timezone and defer queue, not drop. Evaluate as close to fan-out as possible but persist event for audit/replay semantics.
</details>

<details><summary>Thinking/DoD</summary>

Junior boolean; Middle type×channel/defaults; Senior consent policy, race preference change vs queued job, cache invalidation and regional time/DST. Matrix tests every event class.
</details>

### [EVT-06] Cache SMTP OAuth token single-flight

**L3 · CON/RES/SEC · token expiry skew, async lock, stampede · 3 hướng · OAuth provider**

**Bối cảnh:** many emails cause token endpoint call per send. **Invariant:** valid token reused, one refresh/instance, secret not logged, failed refresh not cached forever.

**Task:** cache+single-flight and concurrency benchmark.

<details><summary>3 approaches</summary>

A in-memory token + `SemaphoreSlim` double-check expiry; usually enough. B `AsyncLazy` replaced on expiry/failure. C distributed encrypted cache; fewer refreshes across nodes but exposure/complexity. Refresh before expiry with skew; use monotonic-ish time abstraction for tests, timeout/circuit policy. Do not hold lock during unrelated SMTP send.
</details>

<details><summary>Thinking/test</summary>

Junior store field; Middle lock/expiry/failure; Senior multi-node provider quotas, secret handling, clock skew and fallback. 100 concurrent callers yield one token request, failure then next call can retry.
</details>

### [EVT-07] Transactional outbox cho create user/article

**L4 · DST/DAT · dual write, outbox leasing, at-least-once · 3 hướng · EF+Kafka**

**Bối cảnh:** DB commit then Kafka unavailable loses welcome/article event. **Invariant:** aggregate change and outbox row atomic; relay retry; duplicates tolerated.

**Task:** outbox schema/interceptor/use-case integration, relay and cleanup.

<details><summary>3 directions</summary>

A EF transaction writes outbox JSON. Relay polls keyset/batch, claims lease/`SKIP LOCKED`, publish then mark; crash creates duplicate. B CDC/Debezium; less app poll code, extra infra. C synchronous publish+repair table is weaker variant. Store event ID/type/version/key/payload/occurred/attempt; partition key preserves required scope order. Retention/archive and poison serialization handling.
</details>

<details><summary>Senior acceptance</summary>

Junior retry publisher; Middle recognizes dual-write; Senior lease fencing, batch/ordering, backpressure, schema/privacy and lag SLO. Crash after DB, after broker ack, before mark; eventually event delivered, consumer dedupes.
</details>

### [EVT-08] Inbox/idempotent consumer và giới hạn exactly-once

**L4 · DST/DAT · processed event, unique key, external side-effect ambiguity · 4 hướng**

**Bối cảnh:** crash after email accepted but before Kafka commit causes duplicate. **Invariant:** DB effects dedupe; external effect semantics nói chính xác, không hứa quá mức.

**Task:** inbox and email delivery ledger/provider strategy.

<details><summary>4 approaches</summary>

A in-memory dedupe—không đủ. B Redis SET NX TTL—fast, retention/durability limit. C DB inbox unique EventId in same transaction as notification. D provider idempotency key/delivery API if available. SMTP has ambiguous timeout: server may have accepted. Can record intent before send and outcome after, but cannot atomically couple SMTP; use stable Message-ID/dedupe window or accept at-least-once with UX mitigation.
</details>

<details><summary>Thinking/test</summary>

Junior commit after handler; Middle durable inbox; Senior defines effect boundary, ambiguity/reconciliation and retention. Inject crash at before send/after send/before commit; document possible outcomes.
</details>

### [EVT-09] Retry topics và DLQ không block partition

**L4 · RES/DST/OBS · transient/permanent, backoff, poison pill, replay · 4 hướng · Kafka consumer**

**Bối cảnh:** bad payload/permanent SMTP can retry forever at same offset. **Invariant:** bounded attempts; original metadata retained; normal traffic progresses; replay controlled.

**Task:** error taxonomy, retry topology and operator replay tool.

<details><summary>4 strategies</summary>

A inline retry blocks partition, only short transient. B retry topics 1m/10m/1h + attempt headers. C durable job table scheduler. D DLQ directly for permanent schema/validation. Publish retry/DLQ successfully before commit original; that handoff itself needs failure handling. Redact/encrypt sensitive payload; replay has dry-run/filter/rate limit/audit and prevents loops.
</details>

<details><summary>Thinking/DoD</summary>

Junior catch/log; Middle classify/max attempts; Senior retry storm, ordering impact, operational ownership and data privacy. Tests transient succeeds, permanent DLQ, broker down during handoff.
</details>

### [EVT-10] Tách consumer theo workload/failure domain

**L3→L4 · DST/PRF · consumer group, head-of-line blocking, partition capacity · 3 hướng**

**Bối cảnh:** one loop handles email and domain event; SMTP slow makes other flow lag. **Invariant:** one workload overload not starve critical others.

**Task:** split hosted services/topics/groups and capacity plan.

<details><summary>3 choices</summary>

A same consumer dispatch bounded per-type queues; simple but shared intake. B separate consumers/groups per topic/channel. C routing topic then specialized downstream topics. Topic partition count caps parallelism; key choice controls order. Each worker has bulkhead/retry/DLQ/lag SLO; avoid one consumer instance creating/admin topics at runtime in production.
</details>

<details><summary>Thinking/test</summary>

Junior add threads; Middle isolate pools/topics; Senior failure domains, partition skew, rebalance, deployment ownership and cost. Slow SMTP 10×: article index/in-app lag remains within target.
</details>

### [EVT-11] Follower notification fan-out bounded/resumable

**L4→L5 · STR/CON/DST · keyset batch, sharding, checkpoint, fairness · 4 hướng · ArticleCreated handler**

**Bối cảnh:** sequential follower loop too slow; all Task.WhenAll explodes. **Invariant:** no unbounded memory/connections; retry shard idempotent; celebrity doesn't starve normal jobs.

**Task:** parent fan-out job and shard workers.

<details><summary>4 architectures</summary>

A sequential keyset pages. B bounded parallel per follower. C bulk insert in-app + batch email jobs. D parent event expands child shard events (cursor/id range). D scales/retries; creates many events. Store fan-out job high-water/cursor, stable recipient snapshot semantics, per-user preference/dedupe. Partition/fair queue by parent job, not all celebrity children contiguous if it blocks others.
</details>

<details><summary>Senior acceptance</summary>

Calculate 100k/1m followers, DB params, email quota, completion SLO. Crash/restart each shard; metric progress/oldest age; reconciliation compares eligible recipients vs deliveries.
</details>

### [EVT-12] Kafka ordering và partition expansion drill

**L4 · DST · key scope, partition mapping, rebalance, sequence · 3 hướng**

**Bối cảnh:** ordering may be needed per user/article/conversation, not global; adding partitions remaps keys. **Invariant:** state projection rejects stale version regardless of arrival.

**Task:** document key per event type, simulate out-of-order and expand partitions safely.

<details><summary>3 controls</summary>

A rely partition order per stable key. B entity version/sequence at consumer storage protects stale events. C serialize commands at source. Partition order doesn't cover retry topics/multiple topics or producer changes. Expansion can move future records to new partition while older remain; consumer version check/reconciliation essential. Global order is costly and usually unnecessary.
</details>

<details><summary>Thinking/test</summary>

Junior “Kafka keeps order”; Middle “within partition”; Senior precise scope across retries/rebalance/expansion, monotonic projection and hot-key. Inject versions 3,1,2 and duplicate 3; state remains 3.
</details>

### [EVT-13] Consumer rebalance và long processing

**L4 · DST/RES · poll interval, revoke, cooperative shutdown, batch · 3 hướng**

**Bối cảnh:** long email/fan-out can exceed poll interval and rebalance, producing duplicates. **Invariant:** partition ownership/offset handled correctly; in-flight work bounded.

**Task:** reproduce rebalance then choose polling/worker architecture.

<details><summary>3 patterns</summary>

A process synchronously and tune max poll interval—simple, low parallel. B poll → bounded per-partition worker queues, pause/resume partitions; commit contiguous completed offsets only. C hand off to durable job/outbox then commit Kafka quickly. Never commit past unfinished earlier offset. Revoke callback drains/cancels with deadline; idempotency remains required.
</details>

<details><summary>Thinking/DoD</summary>

Junior increase timeout; Middle understand offset/assignment; Senior partition-aware concurrency, rebalance storm, deploy and lag. Integration test add/remove consumers during slow items.
</details>

### [EVT-14] Notification digest theo timezone

**L4 · STR/DAT · windowing, scheduler, late event, idempotent batch · 3 hướng**

**Bối cảnh:** user wants hourly/daily digest and quiet hours. **Invariant:** event appears at most one logical digest window; timezone/DST policy deterministic; retry same digest safe.

**Task:** aggregation store/window key, scheduler and email render limits.

<details><summary>3 approaches</summary>

A DB pending notification query grouped by user/window. B Redis sorted set/window with DB audit. C stream aggregation. DB easiest durable. Use `(user,channel,windowStart,version)` unique digest job; capture high-water mark; late events go next/correction policy. Batch size/body length limits and links rather than unlimited content.
</details>

<details><summary>Thinking/test</summary>

Junior cron; Middle checkpoint/idempotency/timezone; Senior DST/late event/preferences change, fairness and capacity. Fake clock across DST, process crash after send ambiguity.
</details>

### [EVT-15] End-to-end OpenTelemetry và SLO

**L4 · OBS/DST · trace propagation, consumer lag, RED, burn rate · 3 hướng · HTTP→outbox→Kafka→SMTP/SignalR**

**Bối cảnh:** cần biết notification chậm ở đâu. **Invariant:** correlation survives async boundary; metric labels bounded/no PII.

**Task:** spans/metrics/dashboard/alerts/runbook.

<details><summary>Thiết kế observability</summary>

Trace producer span inject headers; consumer links/parent per semantic; record event type (bounded), not EventId label. Metrics outbox oldest age/count, produce errors, consumer lag, handler duration/outcome, retry/DLQ, delivery latency, queue depth. Define SLI “95/99% durable notifications visible within X”, alerts burn rate not every transient failure. Sampling must retain errors/slow traces.
</details>

<details><summary>Senior DoD</summary>

Chaos Kafka unavailable, SMTP 429, Redis backplane down; dashboard isolates stage and runbook has safe actions/replay. Explain logs vs metrics vs traces and cardinality cost.
</details>

### [EVT-16] Disaster/replay drill cho event pipeline

**L5 · DST/OBS · retention, replay, reconciliation, RPO/RTO · 4 hướng**

**Bối cảnh:** bad deploy corrupts projection or consumer offline beyond normal lag. **Invariant:** source event/DB truth known; replay does not duplicate external effects unexpectedly.

**Task:** runbook reset offsets/rebuild projections/replay DLQ with safeguards.

<details><summary>4 recovery sources</summary>

A Kafka retained events. B outbox/archive table. C authoritative DB snapshot + incremental events. D domain-specific reconciliation. Separate rebuildable projections (Elastic/counts) from non-repeatable effects (email); consumer mode flags/delivery ledger prevent resending mail. Versioned new consumer group/index then verify and cut over is safer than destructive in-place replay.
</details>

<details><summary>Senior acceptance</summary>

State RPO/RTO and retention math. Drill restore new ES index and notification projection while production continues, compare counts/sample/hash, rollback alias/group. Every operator action audited and rate-limited.
</details>
