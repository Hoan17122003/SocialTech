# Polyglot Persistence, Cache, NoSQL và Object Storage

Quy tắc: MySQL hiện tại là baseline. Chỉ thêm store khi query/workload/SLO chứng minh lợi ích lớn hơn chi phí consistency, vận hành, backup và recovery.

### [POLY-01] Cache-aside cho profile

**L2 · Redis · TTL, invalidation, cache key**

**Đề bài:** profile đọc nhiều, sửa ít; privacy/ban phải phản ánh nhanh. Thiết kế payload, key version, TTL, negative cache và invalidation.

<details><summary>Gợi ý</summary>
Tách cache nội dung ít nhạy cảm và authorization. Tránh object graph lớn; đo hit ratio, stale age, serialization cost. Redis mất toàn bộ dữ liệu không được làm hệ thống sai.
</details>

### [POLY-02] Chống cache stampede cho hot post

**L3 · Redis/in-memory · single-flight, stale-while-revalidate**

**Đề bài:** một post có 100.000 request/s và hết TTL đồng thời. Không cho request cùng đổ về database.

<details><summary>Gợi ý</summary>
So sánh local coalescing, distributed lock, probabilistic early refresh, TTL jitter và stale fallback. Queue/waiter phải bounded; lỗi loader không được cache vô hạn.
</details>

### [POLY-03] Redis rate limit nhiều instance

**L3 · Redis Lua · token bucket**

**Đề bài:** rate limit theo user, IP và route; atomic dưới nhiều API node, hỗ trợ burst và proxy hợp lệ.

<details><summary>Gợi ý</summary>
Lua/function gom read-modify-write và TTL. Tính cardinality/memory, clock source, fail-open/fail-closed theo route và header trả về. Test Redis timeout và hot key.
</details>

### [POLY-04] Presence/typing là ephemeral state

**L3 · Redis/SignalR · lease, heartbeat**

**Đề bài:** một user có nhiều connection trên nhiều node; trạng thái tự hết hạn, không cần durability nhưng không được tăng memory vô hạn.

<details><summary>Gợi ý</summary>
Model theo connection lease rồi aggregate theo user. Dùng TTL/heartbeat, disconnect best-effort, fan-out bounded; không ghi heartbeat vào OLTP database.
</details>

### [POLY-05] Cassandra time-bucket cho chat

**L4 · Cassandra/ScyllaDB · partition key, clustering**

**Đề bài:** conversation tồn tại nhiều năm, có thể hàng trăm triệu message; đọc trang mới nhất và lịch sử theo cursor.

<details><summary>Gợi ý</summary>
Thiết kế bucket theo time/size, clustering order, stable message id/sequence và bucket catalog. Đánh giá hot partition, tombstone, compaction, repair, consistency level và late writes.
</details>

### [POLY-06] Cassandra unread/read cursor

**L4 · Wide-column model · monotonic update**

**Đề bài:** lưu read position cho mỗi participant, nhiều thiết bị update lệch thứ tự; giá trị không được lùi.

<details><summary>Gợi ý</summary>
LWT bảo đảm monotonic nhưng có giá. So sánh sequence check ở service/home shard và eventual correction. Unread count nên derive từ high-water marks hay materialized counter?
</details>

### [POLY-07] Elasticsearch index bài viết

**L3 · Elasticsearch/OpenSearch · projection, alias**

**Đề bài:** full-text search theo tiếng Việt, filter community/status/time; update/delete event có thể out-of-order.

<details><summary>Gợi ý</summary>
Index document mang entity version; script/conditional indexing bỏ event cũ. Thiết kế analyzer, mapping, alias-based reindex, permission filter và reconciliation với MySQL.
</details>

### [POLY-08] Search permission không rò dữ liệu

**L4 · Search security · authorization projection**

**Đề bài:** private community, user block và moderation thay đổi nhanh hơn search index. Kết quả tuyệt đối không lộ nội dung trái quyền.

<details><summary>Gợi ý</summary>
Pre-filter trong index có thể stale; post-filter từ source of truth tốn latency và làm page rỗng. Thiết kế over-fetch bounded, permission version/cache và synchronous deny path cho security event.
</details>

### [POLY-09] MinIO media object và logical usage

**L3 · MinIO/S3 · object metadata, ownership**

**Đề bài:** một object có thể được dùng làm avatar, post attachment hoặc chat media; không dùng polymorphic FK thiếu integrity.

<details><summary>Gợi ý</summary>
MySQL giữ `MediaObject` và các bảng usage có FK thật. Object key ngẫu nhiên, checksum, size, MIME xác minh; trạng thái Uploading/Quarantined/Ready/Deleted. Presigned URL chỉ cấp sau authorization.
</details>

### [POLY-10] Resumable multipart upload

**L4 · Object storage · chunks, checksum, finalize**

**Đề bài:** upload 20 GB có thể resume và gửi chunk song song; finalize chỉ một lần, chunk trùng không tăng quota.

<details><summary>Gợi ý</summary>
Thiết kế upload session, part manifest, idempotent part number/checksum, expiry và quota reservation. Race cleanup/finalize cần conditional state. Không proxy toàn bytes qua API nếu direct upload phù hợp.
</details>

### [POLY-11] Media lifecycle và orphan cleanup

**L3 · MySQL/MinIO · mark-and-sweep**

**Đề bài:** object upload xong nhưng không gắn entity, database rollback hoặc delete event thất bại. Dọn rác mà không xóa object đang dùng.

<details><summary>Gợi ý</summary>
Quarantine window, reference/usage query và two-phase delete. Cleanup idempotent, có tombstone, dry-run, rate limit và reconciliation hai chiều giữa DB/object listing.
</details>

### [POLY-12] Document store cho dynamic community form

**L3 · MySQL JSON/MongoDB · schema evolution**

**Đề bài:** community định nghĩa form câu hỏi tham gia tùy ý, version hóa và cần query một số câu trả lời phục vụ moderation.

<details><summary>Gợi ý</summary>
So MySQL JSON + generated columns/index với MongoDB. Lưu definition version cùng submission; validation server-side, field type migration, PII retention và queryability là tiêu chí chính.
</details>

### [POLY-13] Time-series store cho operational metrics

**L4 · Prometheus/ClickHouse · cardinality, retention**

**Đề bài:** thu latency, queue lag và business counters; dashboard p95/p99 không làm OLTP chậm.

<details><summary>Gợi ý</summary>
Metric label cardinality thấp; user/event id vào log/trace. Chọn retention/downsampling, histogram buckets, scrape/push model và định nghĩa metric ownership.
</details>

### [POLY-14] Feature store cho recommendation

**L5 · Redis/Cassandra/warehouse · online/offline consistency**

**Đề bài:** model cần feature online dưới 10 ms và cùng định nghĩa với training data offline. Tránh training-serving skew.

<details><summary>Gợi ý</summary>
Feature registry/version, event-time, freshness, default và lineage. So precompute/push với read-time compute; định nghĩa backfill, point-in-time correct join và privacy deletion.
</details>

### [POLY-15] Chọn ScyllaDB hay Cassandra

**L5 · Technology evaluation · capacity, operability**

**Đề bài:** thực hiện POC chat workload để quyết định giữ Cassandra hay thử ScyllaDB; không benchmark dữ liệu uniform giả tạo.

<details><summary>Tiêu chí hoàn thành</summary>
Hot conversations, payload distribution, read/write mix, p99, compaction, repair, node failure, cost, driver compatibility, migration/rollback. Kết luận có ngưỡng và bằng chứng, không dựa vào marketing.
</details>

### [POLY-16] Kế hoạch loại bỏ một store

**L5 · Architecture fitness · decommission**

**Đề bài:** chọn một trong Redis/Cassandra/Elasticsearch được thêm quá sớm và thiết kế đường quay về MySQL hoặc store khác mà không downtime.

<details><summary>Gợi ý</summary>
Inventory reader/writer, dual-read shadow compare, backfill, cutover, freeze/retention và rollback. Mọi công nghệ mới phải có exit strategy tương tự trước khi production hóa.
</details>
