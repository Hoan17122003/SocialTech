# Chat, Realtime, Cassandra và Elasticsearch

Baseline đã có direct/community/group chat, SignalR, Cassandra message store, MySQL conversation metadata, Elasticsearch search và in-memory side-effect queue. Đây là domain tốt nhất để luyện distributed consistency, ordering và recovery.

### [CHAT-01] Hoàn thiện edit message có version

**L2→L4 · DAT/CON/DST · ownership, optimistic version, projection · 3 hướng · edit stub, Cassandra, Elastic, SignalR**

**Bối cảnh:** edit endpoint chưa hoàn chỉnh. **Invariant:** giữ MessageId/SentAt, chỉ sender trong edit window, không edit deleted, stale edit không thắng.

**Task:** API expected version, authoritative update, event `message.edited` và projection repair.

<details><summary>3 hướng</summary>

A read rồi upsert cùng Cassandra primary key; dễ nhưng race. B LWT/conditional version update; correctness mạnh, cost cao. C append edit event/materialized state; audit/replay tốt, phức tạp. Elasticsearch doc ID phải ổn định và external version/sequence ngăn event cũ overwrite. SignalR chỉ hint, client reconnect phải fetch truth.
</details>

<details><summary>Thinking/test</summary>

Junior controller+update; Middle ownership/version/realtime; Senior source of truth, cross-store failure, audit/retention và reconciliation. Test two edits barrier, edit-vs-delete và ES outage.
</details>

### [CHAT-02] Soft-delete/redact message đúng policy

**L3 · SEC/DAT/DST · tombstone, moderator delete, retention · 3 hướng · delete stub**

**Bối cảnh:** sender/moderator delete có nghĩa khác nhau. **Invariant:** public clients không thấy content; reply/reference vẫn ổn; delete idempotent; search không trả.

**Task:** state transitions, DTO placeholder, event/projection và attachment cleanup policy.

<details><summary>Cách làm</summary>

A overwrite content/state trong Cassandra. B giữ encrypted/internal content nhưng redact DTO. C append tombstone event và compaction/purge sau retention. Route/controller phải đúng; authorize conversation+actor. Attachment có thể quarantine/retain làm evidence. Old edit event không được resurrect delete—dùng version monotonic.
</details>

<details><summary>Thinking/DoD</summary>

Junior set IsDeleted; Middle idempotency/search/realtime; Senior legal/moderation/privacy, event ordering, retention and purge proof. Test delete retry, edit/delete out-of-order, reconnect client.
</details>

### [CHAT-03] Giữ MessageId khi rehydrate Cassandra/Elastic

**L2→L3 · DAT · identity, mapper, rehydration factory · 3 hướng · message stores/search**

**Bối cảnh:** dùng factory Create khi đọc có thể sinh ID/time mới. **Invariant:** round-trip giữ toàn bộ identity/state để reply/edit/dedupe đúng.

**Task:** tách create khỏi rehydrate và contract tests cho Cassandra/Elastic.

<details><summary>3 thiết kế</summary>

A `ChatMessage.Rehydrate` internal factory. B persistence record mapper rồi domain constructor. C mutable setters (nhanh nhưng làm yếu invariant). Search hit nên map DTO/search result, không giả làm authoritative domain entity nếu field thiếu. Test serialization round-trip exact IDs/timestamps/version/state.
</details>

<details><summary>Level thinking</summary>

Junior gán property; Middle phân Create/Rehydrate; Senior aggregate invariant, anti-corruption layer và schema evolution. Đây là câu phỏng vấn tốt về domain model vs persistence model.
</details>

### [CHAT-04] Idempotent send bằng ClientMessageId

**L3→L4 · CON/DST · deduplication, LWT, reserve/write/publish gap · 4 hướng · send methods**

**Bối cảnh:** mobile retry khi timeout có thể tạo hai message/broadcast. **Invariant:** `(sender,conversation,clientMessageId)` có đúng một logical message; retry trả result cũ.

**Task:** failure matrix và atomic dedupe strategy.

<details><summary>4 hướng</summary>

A check Cassandra then insert — race, chỉ baseline. B lookup table + LWT `IF NOT EXISTS`; cần recover nếu reserve rồi append fail. C Redis SET NX TTL; nhanh, durability/expiry ambiguity. D MySQL idempotency record/outbox làm coordination point. Store request fingerprint để same key/different content trả 409. Broadcast/projection consumers cũng dedupe by MessageId/version.
</details>

<details><summary>Thinking/test</summary>

Junior check exists; Middle atomic uniqueness; Senior reserve-write crash, TTL/retention, response replay và multi-region. 100 concurrent same key chỉ một Cassandra logical row/event.
</details>

### [CHAT-05] Không tạo trùng direct/community conversation

**L3 · CON/DAT · canonical pair, unique index, upsert · 3 hướng · `ChatConversationRepository`**

**Bối cảnh:** get-then-create dưới race tạo hai direct conversations. **Invariant:** một direct conversation/canonical pair; một community conversation/community.

**Task:** schema/migration và race-safe get-or-create.

<details><summary>3 cách</summary>

A lưu `DirectPairKey=min:max`, unique `(Kind,PairKey)`; catch duplicate then reload. B deterministic public conversation key hash pair; vẫn cần unique row. C distributed lock pair; không thay DB invariant. Community dùng unique filtered/nullable key phù hợp MySQL. Migration phải merge duplicates/messages/participants có kế hoạch.
</details>

<details><summary>Thinking/acceptance</summary>

Junior get/create; Middle unique constraint+retry; Senior canonicalization, existing duplicate migration, contention và observability. Concurrent integration test across separate DbContexts.
</details>

### [CHAT-06] Cursor Cassandra không skip timestamp trùng

**L3 · DAT/DST · clustering cursor, paging state, TimeUUID · 3 hướng · `GetLatestAsync`**

**Bối cảnh:** cursor chỉ `beforeUtc` bỏ/nhân message có cùng timestamp. **Invariant:** stable descending order, no duplicate/skip.

**Task:** chọn cursor composite và API serialization/version.

<details><summary>3 hướng</summary>

A `(sentAtUtc,messageId)` đúng clustering tuple. B opaque Cassandra paging state; gắn query/schema, khó lâu dài/security-sign. C TimeUUID clustering cung cấp order. Cursor encode base64 JSON + signature/version hoặc opaque server contract; handle deleted rows. Query phải theo partition và clustering predicate Cassandra hỗ trợ.
</details>

<details><summary>Thinking/test</summary>

Junior before time; Middle composite key; Senior clock/order meaning, cursor tamper/schema evolution và time-bucket migration. Generate thousands same timestamp, page size nhỏ, assert exact set/order.
</details>

### [CHAT-07] Mark read và unread count bằng watermark

**L3 · CON/DAT · monotonic cursor, conditional max, multi-device · 3 hướng · participant `LastReadAtUtc`**

**Bối cảnh:** older device receipt không được kéo cursor lùi. **Invariant:** read position monotonic; only active participant; unread không âm.

**Task:** endpoint/hub event, conditional update và efficient unread computation.

<details><summary>3 models</summary>

A `LastReadAtUtc=max`; timestamp tie problem. B last-read composite message cursor/sequence. C per-device cursor rồi aggregate max. Per-message receipt bùng rows ở group chat; watermark thường tốt hơn. Unread có thể count Cassandra after cursor, denormalized counter, hoặc approximate summary; define SLA.
</details>

<details><summary>Thinking/test</summary>

Junior set time; Middle atomic max and authorization; Senior device semantics, clock trust, privacy/read receipt preference và hot query. Test out-of-order receipts từ two devices.
</details>

### [CHAT-08] Typing indicator và presence multi-device

**L2→L4 · CON/DST · ephemeral state, debounce, Redis TTL, heartbeat · 3 hướng · SignalR hubs**

**Bối cảnh:** one connection disconnect không có nghĩa offline; server crash không gửi cleanup. **Invariant:** presence eventually expires, typing best-effort, only authorized viewers.

**Task:** connection set/TTL heartbeat, privacy and rate-limit.

<details><summary>3 hướng</summary>

A in-memory `user→connections`; one instance only. B Redis sets/count + expiring heartbeat/session keys; reconcile disconnect/crash. C dedicated presence service/event stream. Typing nên client debounce + server throttle + TTL, không DB. Avoid non-atomic counter decrement below zero; set members/lease better.
</details>

<details><summary>Thinking/DoD</summary>

Junior bool online; Middle set connections/disconnect; Senior crash/partition, TTL accuracy vs load, privacy and scale-out. Test two tabs, abrupt node death, reconnect and stale expiry.
</details>

### [CHAT-09] Group participant lifecycle và last-admin invariant

**L3→L4 · SEC/CON/DAT · join/leave/remove, role, last admin · 3 hướng · participants**

**Bối cảnh:** participant row có LeftAt nhưng commands thiếu. **Invariant:** removed/left cannot send/join; admin cuối không leave; membership history/audit rõ.

**Task:** transition matrix, API commands and authorization race tests.

<details><summary>3 models</summary>

A reuse row, set/clear LeftAt; đơn giản, history hạn chế. B participant sessions/history rows. C membership event log. Last-admin race giống community owner: lock conversation row/serializable/conditional owner model. Authorization check và message append không atomic cross MySQL-Cassandra; decide whether short stale access acceptable or use command token/version.
</details>

<details><summary>Thinking/test</summary>

Junior CRUD members; Middle transitions/role/unique; Senior cross-store authorization race, audit, invitations và abuse. Barrier two admins leave; invariant survives.
</details>

### [CHAT-10] Delivery/read receipts không nổ cardinality

**L4 · DST/DAT · sent/delivered/read, watermark, ack/replay · 3 hướng**

**Bối cảnh:** per-message×participant rows bùng cho large group. **Invariant:** state chỉ tiến, reconnect hội tụ, duplicate ack harmless.

**Task:** define semantics then model storage/events.

<details><summary>3 hướng</summary>

A per-message receipts: chính xác/đắt. B per-conversation per-user delivery/read watermark. C hybrid watermark + exception (failed delivery). “Sent” ở server commit, “delivered” tới ít nhất một device hay all devices phải nói rõ. SignalR ack không durable; client resync cursor after reconnect.
</details>

<details><summary>Senior lens</summary>

Junior status field trên message; Middle recipient-specific state; Senior cardinality, multi-device/offline, privacy, ordering and retention. Capacity calculate group size×message rate before schema.
</details>

### [CHAT-11] Search edit/delete, tiếng Việt và deep pagination

**L3→L4 · DAT/PRF/DST · analyzer, external version, `search_after`, alias · 4 hướng · Elasticsearch**

**Bối cảnh:** search projection có thể stale và mapping chưa phục vụ Vietnamese/reindex. **Invariant:** authorization filter conversation; delete không hiện; old event không overwrite.

**Task:** mapping v2, stable document ID/version, highlight-safe result và alias rollout.

<details><summary>4 phần giải pháp</summary>

Analyzer standard+lowercase+asciifolding là baseline; custom Vietnamese analyzer/ngram tùy relevance test. Dùng `search_after` composite sort thay from/size sâu. Edit/delete publish versioned projection events; ES external version hoặc compare sequence. Build new index → bulk reindex → verify → alias swap → rollback alias.
</details>

<details><summary>Thinking/test</summary>

Junior Match query; Middle mapping/pagination/auth; Senior precision/recall corpus, versioned index rollout, stale event/reconciliation và cost. Test accents, XSS highlight, delete/edit out of order.
</details>

### [CHAT-12] Bulk reindex Cassandra → Elasticsearch resumable

**L4 · STR/PRF/OBS · batch, token ranges, checkpoint, bulk API · 3 hướng**

**Bối cảnh:** cần rebuild search mà không load toàn history/ảnh hưởng traffic. **Invariant:** rerun idempotent, memory bounded, progress/verifiable.

**Task:** plan partitions/buckets, bulk sizing, throttle, checkpoint and alias swap.

<details><summary>3 hướng</summary>

A iterate known conversations, page messages. B Cassandra token-range scan table designed for global scan (current partition model may make discovery hard). C rebuild from durable Kafka message log if retained. Use bounded channel, bulk retries per item, checkpoint only after accepted, DLQ permanent mapping errors. Throttle based ES rejection/latency.
</details>

<details><summary>Thinking/DoD</summary>

Junior foreach IndexAsync; Middle batch/parallel/resume; Senior online cluster capacity, snapshot high-water mark + catch-up events, verification samples/count/hash và rollback. Kill job repeatedly and prove no gap.
</details>

### [CHAT-13] SignalR scale-out và missed-message recovery

**L4→L5 · DST/RES · Redis backplane, reconnect cursor, gap detection · 3 hướng · hubs**

**Bối cảnh:** groups in-memory; socket delivery can lose/duplicate events. **Invariant:** durable Cassandra is truth; live events only accelerate UI.

**Task:** scale two API instances, reconnect protocol and chaos tests.

<details><summary>3 hướng</summary>

A sticky sessions only—insufficient for broadcasts originated other nodes. B SignalR Redis backplane. C managed SignalR. Regardless, reconnect sends per-conversation last cursor/sequence then fetches gaps; dedupe MessageId client side. Backplane outage behavior: message remains durable, realtime degrades and client polling/resync recovers.
</details>

<details><summary>Thinking/test</summary>

Junior assumes Hub global; Middle backplane/auth on join; Senior delivery guarantee, redis outage, capacity, connection draining during deploy and multi-region. Test node kill between append/broadcast and verify eventual UI convergence.
</details>

### [CHAT-14] Cassandra time-bucket cho conversation lâu năm

**L5 · DAT/PRF · partition sizing, bucket, fan-in read, compaction · 4 hướng · message schema**

**Bối cảnh:** partition toàn conversation tăng vô hạn/hot. **Invariant:** max partition bounded; latest/history cursor vẫn ổn; migration không mất order.

**Task:** estimate rows/bytes, choose bucket, dual-read/write migration and load test.

<details><summary>4 bucket strategies</summary>

A month/day bucket: đơn giản nhưng hot community current bucket. B fixed message-count/sequence bucket. C dynamic bucket metadata. D shard hot bucket then merge (order complexity). Query latest current bucket rồi previous; cursor chứa bucket+clustering key. Choose compaction/retention based time-series deletes/tombstones.
</details>

<details><summary>Senior acceptance</summary>

Submit calculations with average/max content, msg/day, target partition size. Rollout dual-write/backfill/dual-read/cutover/rollback; chaos partial migration. Explain hotspot vs unbounded partition trade-off.
</details>

### [CHAT-15] Chat attachment/moderation quarantine pipeline

**L4 · SEC/DST/STR · pending state, virus scan, media ownership, compensation · 3 hướng · chat+MinIO**

**Bối cảnh:** chat attachment must not be public before scan/moderation. **Invariant:** unauthorized conversation cannot finalize/read; pending/failed visible safely; orphan cleanup.

**Task:** upload session, message state and worker events.

<details><summary>3 UX/architecture choices</summary>

A synchronous scan then send: simple/slow. B create pending attachment/message, async scan then publish. C optimistic publish then retract—risky. Use quarantine prefix/bucket, magic/signature/size/checksum, immutable object key, outbox scan job. Finalize checks uploader still participant and upload session version; duplicate worker idempotent.
</details>

<details><summary>Thinking/test</summary>

Junior reuse post upload; Middle auth/scan/state; Senior UX/risk policy, scanner timeout, media bomb, audit, cost and orphan reconciliation. Inject scanner down/malware/user removed during scan.
</details>

### [CHAT-16] Chọn source of truth cho cross-store chat

**L5 · DST/DAT · authoritative commit, outbox, saga, at-least-once · 4 hướng · Cassandra/MySQL/Elastic/SignalR**

**Bối cảnh:** Cassandra append thành công nhưng in-memory queue/process chết; metadata/search lệch. **Invariant:** accepted message discoverable/recoverable; projections idempotent/rebuildable.

**Task:** ADR chọn authoritative log/store và implement durable handoff.

<details><summary>4 hướng</summary>

A Cassandra truth + Cassandra outbox table/poller. B MySQL transaction message-intent+outbox rồi consumer writes Cassandra. C Kafka message event truth, Cassandra consumer projection. D synchronous best-effort + reconciliation scan (baseline). Không có distributed transaction magic qua all stores. Define when API returns success, duplicate/order keys, per-store replay and poison handling.
</details>

<details><summary>Senior review/DoD</summary>

Failure matrix crash before/after every write, broker partition, stale retry, deploy. Dashboard projection lag/drift; rebuild search/summary without downtime. Explain delivery semantics precisely rather than nói “exactly once”.
</details>
