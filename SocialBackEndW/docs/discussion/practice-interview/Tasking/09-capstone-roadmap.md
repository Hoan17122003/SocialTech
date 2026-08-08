# Feature Roadmap, Capstone và Interview Story Bank

## 1. Thứ tự phát triển khuyến nghị cho chính ứng dụng

Không nên làm 114 task theo số thứ tự một cách máy móc. Chọn một feature slice, đi từ correctness tới reliability rồi performance.

### Phase A — Hoàn thiện domain còn thiếu (L2–L3)

1. Community create/visibility/join/role/rules.
2. Post status, reply tree, save và desired-state vote.
3. Notification pagination/read count.
4. Chat edit/delete/read cursor.
5. Media authorization/signature/streaming.
6. Auth normalized identity/password reset/refresh session.

### Phase B — Correctness dưới concurrency (L3–L4)

1. Unique constraints + exception mapping + optimistic version.
2. Last-owner/admin invariants; report claim lease.
3. ClientMessageId idempotency và conversation uniqueness.
4. Avatar/attachment compensation, quota reservation.
5. Bounded queues/concurrency, timeout budgets, graceful shutdown.

### Phase C — Reliability nhiều store/process (L4)

1. Outbox/inbox, retry topics, DLQ/replay.
2. Versioned event/projections và reconciliation jobs.
3. SignalR backplane/reconnect gap recovery.
4. Notification fan-out shards/digest/preferences.
5. Cache authorization boundary/stampede/invalidation.

### Phase D — Scale và production evidence (L4–L5)

1. Personalized/trending feed, hot counters.
2. Cassandra buckets, bulk reindex, direct/resumable media upload.
3. OpenTelemetry/SLO/capacity/load shedding.
4. Zero-downtime migrations, deletion saga, disaster replay và chaos game day.

## 2. Capstone tích hợp

### [CAP-01] Community Governance Platform

**L3→L4 · COM-01..12 + POST-01/12/13 · 3 kiến trúc**

**Đề bài:** hoàn thiện community lifecycle: create owner, visibility, join approval, invite, roles/rules, post capability, report claim/resolve, audit/appeal.

<details><summary>Phân rã kiểu Senior</summary>

Chốt capability matrix và state machines trước controller. Milestone 1 read/write happy path; 2 DB constraints+concurrency; 3 notification outbox/audit; 4 cache+observability; 5 load/chaos. Source of truth MySQL. Đặt integration tests last-owner, invite quota, ban-vs-post, claim lease. Rollout additive tables/version columns before enforcing new policies.
</details>

<details><summary>3 hướng kiến trúc và interview story</summary>

A service-centric đơn giản; B domain methods+policy service (khuyến nghị); C event-sourced moderation only when audit scale justifies. Story: “Tôi phát hiện check-then-act không giữ invariant owner cuối; tôi dùng …, chứng minh bằng barrier test và đo contention …”.
</details>

### [CAP-02] Engagement Engine: Vote, Comment, Save, Trending

**L3→L4 · POST-03..12 + DATA-01/05/09 · 3 consistency models**

**Đề bài:** reply tree, vote desired-state+score, saved list, view counter, keyset feed và trending projection.

<details><summary>Milestones và choices</summary>

Correct DB version: count-on-read/atomic SQL. Then denormalized counters + reconciliation. Finally event projection/trending if evidence needs scale. Test concurrent votes, cross-post parent, insert between pages, hot view count. Metrics score drift, feed p99, DB rows examined, engagement event lag.
</details>

<details><summary>Interview drill</summary>

So sánh offset/keyset; toggle/desired-state; transactional counter/eventual projection; raw score/time-decay/Wilson. Nêu ngưỡng tải khiến bạn đổi giải pháp—đây là điểm phân biệt “biết pattern” và “biết quyết định”.
</details>

### [CAP-03] Secure Account & Session Center

**L3→L5 · AUTH-01..14 · 3 session architectures**

**Đề bài:** normalized identity, Argon2 migration, atomic throttling/reset, verification, refresh rotation/reuse, multi-device sessions, logout all, key rotation và security observability.

<details><summary>Decomposition</summary>

Threat model assets/actors/entry points first. Build `UserSession`/token family, opaque refresh hash, CAS rotate; short access token with sid/jti policy. Security email via outbox. Migration legacy hash and current refresh sessions staged. Red-team replay, enumeration, forged forwarded IP, Redis outage and stolen token.
</details>

<details><summary>Interview story</summary>

Giải thích vì sao JWT không tự động stateless khi cần revoke/reuse detection; vì sao `GET` rồi `DELETE` reset token race; vì sao fail-open/fail-closed phụ thuộc endpoint. Có runbook compromised signing key.
</details>

### [CAP-04] Reliable Notification Platform

**L4→L5 · EVT-01..16 · 3 delivery tiers**

**Đề bài:** notification durable, preferences/digest, outbox/inbox, split consumers, retry/DLQ, fan-out shards, trace/SLO và replay.

<details><summary>Delivery tiers</summary>

Tier A security/account email: durable, high priority, cannot opt-out. Tier B in-app social: durable DB, realtime best-effort. Tier C promotional/digest: preference/quiet hour, lower priority. Separate topics/queues/bulkheads/SLOs. External SMTP exactly-once not promised; use stable intent/delivery ledger and document ambiguity.
</details>

<details><summary>Failure demo bắt buộc</summary>

Crash after DB commit, after Kafka ack, after SMTP acceptance; poison JSON; Kafka outage; celebrity fan-out; replay new projection without resending email. Dashboard shows outbox age/lag/retry/DLQ/delivery latency.
</details>

### [CAP-05] Reliable Realtime Chat

**L4→L5 · CHAT-01..16 + CORE-05/06/10 · 4 stores/boundaries**

**Đề bài:** idempotent send, unique conversation, edit/delete/read, group lifecycle, bounded durable side effects, ordered workers, reconnect, search projection và Cassandra buckets.

<details><summary>Senior design sequence</summary>

Define authoritative commit and message version/sequence. Make send idempotent. Make metadata/search rebuildable. Add bounded queue/durable outbox. Scale SignalR and reconnect resync. Only then parallelize by conversation and bucket Cassandra. Every cross-store step gets event ID/version and reconciliation.
</details>

<details><summary>Interview demo</summary>

Kill app after Cassandra append; disconnect Redis backplane; deliver edit/delete out of order; hot one conversation. Client eventually converges, last preview never moves backward, memory bounded. Explain why a Task/Hub event is not durable delivery.
</details>

### [CAP-06] Secure Large Media Pipeline

**L4→L5 · MEDIA-01..14 · streaming + workflow**

**Đề bài:** authorized direct/resumable upload, quota, magic/virus quarantine, derivatives, range download, compensation, orphan sweeper và export.

<details><summary>State machine</summary>

`Initiated→Uploading→Uploaded→Scanning→Ready|Rejected→Deleting→Deleted`, versioned CAS. DB session owns object prefix/expected checksum/size/resource. Only Ready gets read grant. Worker jobs idempotent, outbox-backed. Range/direct delivery avoids app memory/egress when possible. Reconciliation catches stale sessions/orphans/missing objects.
</details>

<details><summary>Proof</summary>

Upload 10GB without process RAM growth, resume after lost response, concurrent last-quota, scanner down, permission revoked before finalize, range seek, kill worker each transition. Threat review includes IDOR/polyglot/archive bomb/presigned leakage.
</details>

### [CAP-07] Personalized Hot Feed

**L4→L5 · POST-08..11 + DATA-05..11 + EVT-11 · 4 architectures**

**Đề bài:** privacy-safe feed from follows/memberships, keyset cursor, cache, ranking, hot author/view, fan-out and repair.

<details><summary>Evolution plan</summary>

Start SQL fan-out-on-read with proper indexes/projection. Add Redis public snapshots/single-flight. Measure. If read cost requires, create feed projection/outbox fan-out; hybrid celebrity read path. Version feed items for remove/ban; reconcile. Trending separate from following feed product semantics.
</details>

<details><summary>Capacity/interview</summary>

Calculate follow-degree distribution, post rate, read/write amplification and storage. Explain hot-key, staleness security vs ranking, backfill and cursor semantics. Load includes celebrity/skew, not uniform synthetic users.
</details>

### [CAP-08] User/Community Deletion and Data Governance

**L5 · AUTH-12 + COM-12 + MEDIA-13/14 + EVT-16 · saga/reconciliation**

**Đề bài:** immediate access revoke, pseudonymize/purge across MySQL/MinIO/Cassandra/Elastic/Kafka projections, legal retention, progress API and proof.

<details><summary>Workflow</summary>

Inventory ownership per store. Tombstone/version first prevents resurrection. Orchestrated job steps idempotent with fencing/checkpoint. Separate reversible closing window from irreversible purge. Late events compare deletion version. Backups/retention documented, not silently claimed deleted immediately.
</details>

<details><summary>Interview evidence</summary>

Show failure matrix, kill/resume, duplicate/out-of-order tombstone, reconciliation report and operator runbook. Discuss saga vs distributed transaction and legal/privacy trade-offs.
</details>

### [CAP-09] Production Readiness & Zero-Downtime Release

**L4→L5 · CORE-11/12 + DATA-12..16 · SRE/operations**

**Đề bài:** Problem Details, options validation, health, OpenTelemetry/SLO, load shedding, migrations, graceful deploy and chaos.

<details><summary>Milestones</summary>

1 baseline/load model; 2 observability; 3 resource limits/timeouts; 4 readiness/drain; 5 expand-contract migration; 6 chaos/postmortem. Choose critical/optional dependencies and degradation modes. Feature flags/canary/rollback; dashboards before traffic.
</details>

<details><summary>Interview evidence</summary>

Bring one trace, load graph, query plan, capacity math and incident postmortem. State measured before/after and complexity cost. Avoid “production-ready because tests pass”.
</details>

### [CAP-10] Disaster Recovery: Rebuild Every Projection

**L5 · DST/STR/OBS · replay, snapshot, high-water mark, verification · Kafka/Cassandra/Elastic/Redis/MySQL**

**Đề bài:** rebuild Elastic chat index, feed/counters/cache/notification read models while writes continue.

<details><summary>Senior plan</summary>

Choose truth per projection. Capture high-water mark; bulk snapshot to versioned destination; consume changes after mark; verify count/hash/sample; atomic alias/version cutover; monitor; rollback. Non-repeatable effects like email excluded. Throttle and checkpoint. State RPO/RTO/retention math.
</details>

<details><summary>Failure drill</summary>

Interrupt snapshot/backfill, deliver duplicates and stale versions, corrupt one shard, let source compact old records. Tool must resume or fail loudly with a gap—not report false success.
</details>

## 3. Ma trận chọn task theo mục tiêu phỏng vấn

| Mục tiêu | Task nên làm và kể sâu |
|---|---|
| Junior C#/.NET | CORE-01/02/03, POST-03/07, EVT-02, MEDIA-02 |
| Junior ASP.NET | AUTH-09/13, DATA-13/14, COM-02, CHAT-01 |
| Middle concurrency | COM-04/06, POST-06/13, AUTH-04/05, CHAT-04/07 |
| Middle database | DATA-01..05/09/10, POST-08, COM-08/09 |
| Middle Kafka | EVT-01/07/08/09/10/13, CHAT-16 |
| Middle performance | CORE-03/04/11/12, DATA-05/08/15, MEDIA-03 |
| Senior-ready system design | CAP-04/05/06/07/08/10 |
| Production/incident | CORE-06/11/12, DATA-12..16, EVT-15/16 |

## 4. Template biến một task thành kinh nghiệm phỏng vấn

```md
# STAR + Technical Depth
Situation: tải, người dùng, symptom và constraint thật.
Task: invariant/SLO tôi chịu trách nhiệm.
Alternatives: A/B/C, số liệu và trade-off.
Action: decision, implementation, test, rollout.
Result: correctness + p95/p99/throughput/error/cost trước-sau.
Failure: điều đã hỏng hoặc chaos test, cách phục hồi.
Reflection: ngưỡng nào khiến tôi đổi kiến trúc lần nữa.
```

Không nói “em dùng Redis/Kafka vì nhanh”. Hãy nói workload nào, boundary nào, guarantee gì, alternative nào bị loại, bằng chứng nào xác nhận và failure nào vẫn còn.

## 5. Bộ câu hỏi phản biện tự phỏng vấn

<details><summary>Core/concurrency</summary>

1. Task khác Thread; async có tạo thread không?
2. I/O-bound và CPU-bound trong SocialBackEnd nằm ở đâu?
3. Vì sao `Task.WhenAll` followers/files có thể làm chậm hơn?
4. Queue capacity tính thế nào; full mode nào cho chat search?
5. Test race last-owner/vote/avatar deterministic thế nào?
6. ThreadPool starvation khác CPU saturation/connection exhaustion ra sao?
7. Cancellation trước/sau DB commit có semantics gì?
8. Keyed ordering chat có những implementation nào?
</details>

<details><summary>Database/cache</summary>

1. Unique constraint giải race nào mà app check không giải được?
2. Optimistic vs pessimistic/serializable cho từng invariant?
3. Offset vs keyset dưới insert/delete?
4. Cache authz stale nguy hiểm khác cache trending stale ra sao?
5. Stampede multi-node; distributed lock có thật sự cần strict lock?
6. Denormalized counter drift được phát hiện/sửa thế nào?
7. DB–MinIO–Kafka vì sao không một transaction; chọn commit point nào?
8. Zero-downtime add normalized email/bucket schema thế nào?
</details>

<details><summary>Kafka/distributed/realtime</summary>

1. At-most/at-least/exactly-once và SMTP side effect?
2. Outbox/inbox giải quyết boundary nào, không giải quyết gì?
3. Ordering Kafka trong scope nào; retry topic làm gì ordering?
4. Consumer crash trước/sau business effect/commit?
5. Poison event không block partition bằng cách nào?
6. SignalR backplane có biến websocket thành durable không?
7. Client chat recover missed/duplicate events thế nào?
8. Cassandra partition/bucket chọn từ phép tính nào?
</details>

<details><summary>Security/production</summary>

1. Refresh rotation/reuse detection cần state vì sao?
2. Reset token single-use atomic với DB failure thế nào?
3. Media `[Authorize]` vẫn IDOR vì sao?
4. Redis auth down nên fail-open hay closed?
5. Metric label nào gây cardinality explosion/PII?
6. Liveness/readiness khác nhau với dependency outage?
7. Retry khi nào tạo retry storm?
8. Khi p99 tăng, CPU thấp, triage theo bằng chứng nào?
</details>

## 6. Progress tracker gợi ý

Với mỗi task, ghi `Not started / Designed / Implemented / Tested / Load-tested / Explained`. Task chỉ được đánh “Explained” khi bạn có thể trình bày 10 phút không nhìn tài liệu, vẽ data flow/failure boundary và trả lời ít nhất ba phản biện.
