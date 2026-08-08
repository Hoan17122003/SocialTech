# EF Core/MySQL, Redis, Performance và Production Operations

Nhóm này biến các feature trước thành bằng chứng phỏng vấn: query plan, isolation, cache correctness, load test, metrics, migration và repair.

### [DATA-01] N+1 và projection audit cho feed/chat inbox

**L2→L3 · PRF/DAT · N+1, projection, split query, AsNoTracking · 3 hướng · repositories/builders**

**Bối cảnh:** mapping URL/user/conversation theo vòng lặp dễ phát sinh N+1. **Invariant:** query count/payload bounded, không đổi data semantics.

**Task:** instrument SQL count, choose projection/batch loading and benchmark.

<details><summary>3 hướng</summary>

A Include graph; easy nhưng cartesian/payload. B direct DTO projection; thường tốt nhất. C batch-load keys then dictionary map; useful cross-store/presigned. DbContext not thread-safe—không parallel EF calls cùng scope. `AsNoTracking` read-only; inspect generated SQL and execution plan.
</details>

<details><summary>Thinking/DoD</summary>

Junior Include; Middle projection/query count; Senior API shape, cardinality, split/single query trade-off and benchmark distribution. Regression test asserts max SQL commands for page size.
</details>

### [DATA-02] Isolation anomaly lab bằng SocialBackEnd entities

**L3 · DAT/CON · lost update, non-repeatable read, phantom, deadlock · 4 scenarios · MySQL**

**Task:** reproduce with two DbContexts: vote lost update, last-owner leave, report claim, quota reservation. Record behavior under configured isolation.

<details><summary>Gợi ý thực nghiệm</summary>

Use barriers after reads, not sleeps. Compare atomic SQL, optimistic concurrency, row locks and serializable transaction. Capture SQL/locks/deadlock victim. Isolation alone may not protect app invariant if reads/writes structured wrong. Retry entire transaction only, with jitter and idempotent external effects excluded.
</details>

<details><summary>Level thinking</summary>

Junior transaction = always safe; Middle knows anomaly/conditional update; Senior chooses weakest sufficient mechanism, lock order, contention/throughput and recovery. Deliver a matrix anomaly→mechanism→cost.
</details>

### [DATA-03] Optimistic concurrency token cho mutable aggregates

**L3 · CON/DAT · row version, ETag/If-Match, conflict merge · 3 hướng · post/community/report**

**Bối cảnh:** two editors overwrite silently. **Invariant:** stale client never silently destroys newer/moderator change.

**Task:** version column/EF concurrency, API conditional request and UX response.

<details><summary>3 approaches</summary>

A numeric Version increment conditional. B provider timestamp/rowversion equivalent (MySQL specifics). C compare selected fields/status in conditional SQL. Expose ETag/expectedVersion, catch `DbUpdateConcurrencyException`, reload current. Auto-retry only commands whose intent remains valid; user-edit conflicts often need 409/412 and diff.
</details>

<details><summary>Thinking/test</summary>

Junior last write wins; Middle version/conflict; Senior semantic merge, security transition precedence, event version and rolling migration. Test author edit vs moderator remove.
</details>

### [DATA-04] Transaction boundary không giữ khi gọi network

**L3 · DAT/RES · transaction scope, lock duration, outbox · 3 hướng · article/user flows**

**Bối cảnh:** Gemini/MinIO/Kafka/SMTP inside DB transaction increases locks and ambiguity. **Invariant:** transaction short; external side effect recoverable.

**Task:** map existing use cases and refactor one critical path.

<details><summary>3 patterns</summary>

A external validate/upload before transaction + compensation. B transaction writes pending state/outbox, worker external work. C external call after commit best-effort + reconciliation (weaker). Do not wrap arbitrary async network in TransactionScope hoping atomicity. Measure transaction duration/lock waits before/after.
</details>

<details><summary>Thinking/DoD</summary>

Junior one big transaction; Middle minimizes scope; Senior chooses authoritative commit, user-visible pending state, recovery and SLO. Failure matrix required.
</details>

### [DATA-05] Index design cho membership/feed/report

**L3 · PRF/DAT · composite index, selectivity, covering, write amplification · 3 workloads**

**Task:** capture real queries, propose indexes, run `EXPLAIN`, benchmark read/write and remove redundant indexes.

<details><summary>Senior method</summary>

Start predicate equality → range/sort → selected columns; tie-breaking cursor. Candidate examples require validation: membership `(CommunityId,Status,CreatedAtUtc,Id)`, feed `(CommunityId,Status,PublishedAtUtc,Id)`, report `(CommunityId,Status,CreatedAtUtc,Id)`. Low-cardinality status alone weak. Include/cover syntax/provider varies. Every index costs inserts/storage/cache.
</details>

<details><summary>Acceptance/interview</summary>

Show plans rows examined, filesort, latency cold/warm, database size and write throughput. Explain leftmost prefix and why “index every column” fails.
</details>

### [DATA-06] Cache-aside profile/community detail đúng security boundary

**L3 · PRF/SEC/DST · TTL, key schema, DTO snapshot, invalidation · 3 hướng · Redis**

**Bối cảnh:** cache entity hoặc user-dependent capability chung key can leak. **Invariant:** public snapshot separate private/user fields; DB truth recoverable if Redis down.

**Task:** key/version/TTL, serialization and update invalidation.

<details><summary>3 patterns</summary>

A cache only public DTO. B public base + per-user capability cache. C full per-user view (high cardinality). Cache-aside read: get→DB→set; update DB commit then invalidate/version. TTL is safety net, not exact consistency. Negative cache short. Schema version key avoids rolling-deploy deserialization conflict.
</details>

<details><summary>Thinking/test</summary>

Junior cache object; Middle DTO/key/TTL/invalidate; Senior authorization freshness, cardinality/memory, Redis-down/stampede and privacy. Ban/update while cached and multi-instance tests.
</details>

### [DATA-07] Thay Redis `KEYS prefix*` bằng invalidation có kiểm soát

**L3→L4 · PRF/DST · SCAN, versioned namespace, cache tags · 4 hướng · `CacheAdapter.ClearAsync`**

**Bối cảnh:** `KEYS` blocks Redis at large keyspace; public cache controller may be dangerous. **Invariant:** invalidation cannot scan/block production or let unauthorized caller purge arbitrary cache.

**Task:** secure/remove controller, choose invalidation strategy and load test.

<details><summary>4 alternatives</summary>

A exact known keys. B namespace version key (`feed:v42:*`) and bump version; old expires. C maintain tag/set of keys; cleanup complexity. D incremental SCAN+UNLINK in admin background, rate-limited. Avoid exposing raw get/clear endpoints; admin auth/audit. Prefix patterns/user input must not become broad delete.
</details>

<details><summary>Thinking/DoD</summary>

Junior KEYS/delete; Middle SCAN/version/auth; Senior blast radius, cluster topology, orphan key memory budget and runbook. Seed million keys, invalidation doesn't spike p99.
</details>

### [DATA-08] Cache stampede + stale-while-revalidate

**L4 · CON/PRF/RES · single-flight, TTL jitter, stale window · 4 hướng · hot feed/post**

**Bối cảnh:** hot key expiry sends burst DB. **Invariant:** bounded loaders, stale only within product/security policy, error doesn't poison forever.

**Task:** implement baseline, single-flight and SWR; compare load.

<details><summary>4 tools</summary>

A TTL jitter spreads expiries. B local single-flight. C distributed lock with lease/double-check. D stale-while-revalidate with soft/hard expiry. Security removal/ban cannot serve stale like trending content; invalidate or reauthorize. Lock lease expiry means two loaders possible—loader must be safe; don't require strict distributed mutual exclusion for a performance cache.
</details>

<details><summary>Thinking/test</summary>

Junior longer TTL; Middle single-flight/error cleanup; Senior staleness classes, node count, lock failure and overload. 1k concurrent miss: DB calls bounded and p99 measured.
</details>

### [DATA-09] Keyset pagination thống nhất và cursor contract

**L3 · DAT/SEC · composite seek, signed cursor, schema version · 3 domains · feed/comment/notification**

**Task:** reusable cursor encoding/validation without forcing same sort keys on every domain.

<details><summary>Design choices</summary>

Create domain-specific cursor payload `{v, sortTime, id, filtersHash?}` and common signer/codec. A transparent query params; simple/tamperable but server validates. B opaque base64+HMAC. C server-stored cursor; state/cost. Bind cursor to filter/user when data leakage/tamper matters. Version for schema changes, cap page size, deterministic null sorting.
</details>

<details><summary>Thinking/DoD</summary>

Junior offset; Middle seek; Senior live vs snapshot semantics, deleted rows, replay/tamper and contract evolution. Property test concatenated pages equals ordered eligible set under inserts.
</details>

### [DATA-10] Batch notification writes và DB backpressure

**L3→L4 · STR/PRF · bulk insert, chunk, parameter limit, transaction size · 3 hướng**

**Bối cảnh:** follower fan-out one insert/save each wastes round trips; giant transaction locks/log grows. **Invariant:** chunks idempotent, partial progress resumable.

**Task:** benchmark EF AddRange chunks, provider bulk method and job sharding.

<details><summary>3 ways</summary>

A AddRange+Save per bounded chunk. B bulk insert library/raw SQL with unique business key. C child jobs per recipient range. Determine batch size empirically vs packet/parameters/log/locks. Commit checkpoint only after batch; retry duplicate handled by unique key. Adaptive throttle from DB latency/rejections.
</details>

<details><summary>Thinking/test</summary>

Junior SaveChanges each; Middle chunk/bulk/unique; Senior redo log/replication lag, fair scheduling and recovery. Benchmark throughput/p95 and crash batch boundary.
</details>

### [DATA-11] Reconciliation framework dùng lại cho counters/media/search

**L4 · STR/OBS · keyset batch, checkpoint, dry-run, idempotent repair · 3 hướng**

**Bối cảnh:** multi-store eventually drifts; ad-hoc scripts nguy hiểm. **Invariant:** scan bounded/resumable, repair scoped/audited, concurrent live writes không bị overwrite stale.

**Task:** generic job shell + domain-specific detector/repairer.

<details><summary>3 approaches</summary>

A CLI one-shot with keyset/dry-run. B persisted job/checkpoint table + background worker. C distributed shards via Kafka. Each item emits observed/expected/action/version; conditional repair only if state unchanged or recompute at write. Rate limit, pause/kill switch, max mutations and sample verification. Reconciliation is safety net, not excuse for broken primary path.
</details>

<details><summary>Thinking/DoD</summary>

Junior load all/fix; Middle pagination/checkpoint; Senior live-race, blast radius, approvals, metrics and rollback/quarantine. Kill/resume million-item fixture, no skipped IDs.
</details>

### [DATA-12] Zero-downtime schema migration

**L4→L5 · DAT/OBS · expand-migrate-contract, dual read/write, backfill · 3 scenarios**

**Task:** plan migrations for normalized email, chat time bucket and event version while old/new app coexist.

<details><summary>Senior flow</summary>

Expand additive nullable column/table/index online; deploy code writes both/reads fallback; backfill keyset throttled/checkpoint; verify; switch reads; stop old writes; enforce constraint/drop old only later. Avoid rename/drop in same deploy. Feature flag/metric coverage and rollback before contract. Index creation locking/provider behavior must be tested on production-like size.
</details>

<details><summary>Acceptance</summary>

Run old and new binary/version simulation, interrupt backfill, rollback app. No request errors/data divergence; document point after which rollback requires forward fix.
</details>

### [DATA-13] Problem Details + trace ID và exception taxonomy

**L2→L3 · OBS/SEC · RFC Problem Details, 409/412/429/503, redaction · 3 hướng · middleware**

**Bối cảnh:** generic exceptions/messages inconsistent; concurrency/security errors need stable machine code. **Invariant:** no stack/internal secret to client; trace correlation; correct retry hint.

**Task:** exception taxonomy and middleware mapping with tests.

<details><summary>Design</summary>

A custom exception mapping dictionary. B ASP.NET ProblemDetails service/factory. C result/error union at application boundary plus unexpected middleware. Include type/title/status/code/traceId, field errors; detail environment-safe. Map duplicate/optimistic conflict distinctly, dependency timeout 503/504 by ownership, rate 429+Retry-After. Don't use exceptions for expected high-volume flow if cost matters.
</details>

<details><summary>Thinking/DoD</summary>

Junior catch 500; Middle semantic status/codes; Senior security disclosure, client retry contract, localization/versioning and telemetry aggregation. Golden API contract tests.
</details>

### [DATA-14] Liveness/readiness/degraded dependency health

**L3 · RES/OBS · health checks, startup, criticality, thundering probe · 3 hướng · all dependencies**

**Bối cảnh:** app uses MySQL/Redis/Kafka/MinIO/Cassandra/Elastic/Gemini/SMTP; not all should gate traffic equally. **Invariant:** liveness doesn't restart app for remote outage; readiness reflects critical request capability.

**Task:** dependency classification, timeout/caching of checks and deploy behavior.

<details><summary>3 levels</summary>

Liveness only process event loop/basic. Readiness checks critical MySQL/auth config and startup migrations carefully. Feature/degraded health reports Kafka/search/media separately without removing all API traffic. Probes bounded timeout, no heavy query/topic creation, optionally cache result to avoid probe storm. Readiness false before graceful drain.
</details>

<details><summary>Thinking/test</summary>

Junior ping all; Middle critical vs optional; Senior orchestrator feedback loops, dependency outage, startup ordering and SLO. Chaos each dependency; expected routes/deploy status documented.
</details>

### [DATA-15] OpenTelemetry + performance budget cho một request

**L3→L4 · OBS/PRF · RED, spans, histogram, cardinality · 3 hướng · profile/feed/create article**

**Task:** choose one flow, set 300ms/2s budget, instrument HTTP→EF/Redis/MinIO/Gemini/Kafka and prove bottleneck.

<details><summary>Measurement plan</summary>

Metrics request rate/errors/duration p50/p95/p99, dependency duration, DB pool, ThreadPool, GC allocation, cache hit, queue depth. Trace spans with route/event type bounded attributes; IDs in log/trace not metric labels. Benchmark/load warmup, representative data, open vs closed load and coordinated omission awareness. Change one variable then remeasure.
</details>

<details><summary>Senior outcome</summary>

ADR shows baseline, hypothesis, evidence, change, regression and complexity cost. Explain why average/one Stopwatch/local Debug run are insufficient.
</details>

### [DATA-16] Overload/chaos game day

**L5 · RES/OBS/PRF · load shedding, bulkhead, retry storm, runbook · 5 failures · full app**

**Task:** inject MySQL 10× latency, Redis down, Kafka unavailable, Elasticsearch reject and MinIO slow while mixed HTTP/chat load runs.

<details><summary>Senior decomposition</summary>

For each failure predict symptom, SLI, failure propagation and safe mitigation before test. Bound concurrency/queues; timeouts from deadline; retries budget+jitter; shed optional Gemini/search/media before critical auth/chat; circuit/bulkheads where justified. Record recovery behavior—backlogs can cause second outage after dependency returns; drain throttled.
</details>

<details><summary>Definition of Done</summary>

No unbounded memory/thread/connection growth. Dashboard localizes failure, alerts actionable, runbook has pause/replay/rollback. Write incident timeline/postmortem and compare predictions with evidence. Đây là capstone production interview mạnh nhất.
</details>
