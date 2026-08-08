# Streaming, CDC, Analytics và OLAP

Quy tắc: event contract, ownership, event-time, replay và data quality phải rõ trước khi chọn Kafka Streams, Flink, ClickHouse hay lakehouse.

### [DATA-01] Chuẩn hóa integration event envelope

**L3 · Kafka · schema, correlation, version**

**Đề bài:** định nghĩa envelope dùng chung cho article, membership, chat và notification mà không biến thành generic event khó quản trị.

<details><summary>Gợi ý</summary>
EventId, EventType, SchemaVersion, AggregateId/Version, OccurredAt, Producer, TraceId và payload typed. Phân biệt domain event với integration event; không nhét PII không cần thiết.
</details>

### [DATA-02] Schema compatibility gate

**L4 · Schema Registry · backward/forward compatibility**

**Đề bài:** producer và consumer deploy độc lập; field đổi tên/type không được làm consumer cũ chết.

<details><summary>Gợi ý</summary>
So JSON Schema, Avro, Protobuf; compatibility CI, default/optional, enum evolution và deprecation window. Test producer mới→consumer cũ và ngược lại.
</details>

### [DATA-03] Debezium CDC cho MySQL

**L4 · Debezium/Kafka · binlog, snapshot**

**Đề bài:** đồng bộ projection/analytics từ row changes mà không sửa mọi service. Thiết kế POC và giới hạn semantic.

<details><summary>Gợi ý</summary>
CDC thấy row change, không tự biết business intent. Đánh giá initial snapshot, DDL, binlog retention, GTID, connector offset, tombstone, PII và outbox event router.
</details>

### [DATA-04] Outbox CDC thay polling relay

**L4 · Debezium Outbox · ordering, cleanup**

**Đề bài:** so relay polling hiện tại với Debezium đọc outbox; chọn theo lag, DB load và operability.

<details><summary>Gợi ý</summary>
Đo end-to-end p95, failover, duplicate, partition key và connector outage. Cleanup chỉ sau retention an toàn; migration cần chạy song song mà không double publish nguy hiểm.
</details>

### [DATA-05] Kafka partition strategy

**L3 · Kafka · ordering, skew**

**Đề bài:** chọn key cho chat, user activity, post projection và notification; celebrity/hot conversation không làm một partition nghẽn vô hạn.

<details><summary>Gợi ý</summary>
Ordering cần theo aggregate nào thì key theo aggregate đó. Đo key distribution, largest-key rate và consumer capacity; salting phá ordering nên cần redesign nếu hot key vượt một partition.
</details>

### [DATA-06] Retry topic và DLQ

**L3 · Kafka · retry budget, poison event**

**Đề bài:** transient dependency lỗi cần retry có delay; validation/schema lỗi không được loop vô hạn.

<details><summary>Gợi ý</summary>
Main→retry theo delay→DLQ, giữ original metadata/attempt/error class. Ordering bị ảnh hưởng phải được chấp nhận hoặc serialize theo key; replay DLQ có audit/rate limit.
</details>

### [DATA-07] Consumer lag SLO và autoscaling

**L4 · Kafka operations · oldest age, throughput**

**Đề bài:** scale consumer theo lag nhưng không vượt partition count hoặc làm database downstream quá tải.

<details><summary>Gợi ý</summary>
Lag records chưa đủ; theo oldest event age và processing time. Autoscale có max concurrency/bulkhead, rebalance cost và downstream capacity budget.
</details>

### [DATA-08] Stream trending hashtag

**L4 · Kafka Streams/Flink · window, watermark**

**Đề bài:** top hashtag theo 5 phút/1 giờ/24 giờ, region; late event và spam correction.

<details><summary>Gợi ý</summary>
Event-time window, grace/allowed lateness, state store/changelog và retraction/correction. Nêu output update semantics, key cardinality và cách rebuild từ retention.
</details>

### [DATA-09] Notification fan-out pipeline

**L4 · Kafka · chunking, backpressure**

**Đề bài:** article của celebrity tạo hàng triệu notification, không được giữ follower list trong một message hoặc transaction.

<details><summary>Gợi ý</summary>
Tạo campaign/job, partition follower ranges, chunk tasks, user preference filter và idempotent notification key. Rate limit email/push và metric progress/lag/failure.
</details>

### [DATA-10] ClickHouse analytics model

**L4 · ClickHouse · MergeTree, partition/order key**

**Đề bài:** dashboard event theo time, feature, community và country ở hàng tỷ rows; ingestion từ Kafka.

<details><summary>Gợi ý</summary>
Chọn partition theo thời gian vừa phải, `ORDER BY` theo query/filter phổ biến, materialized view cho aggregate và TTL. Duplicate handling, late event, dimension change và PII minimization.
</details>

### [DATA-11] Sessionization user activity

**L4 · Stream/OLAP · event-time, late event**

**Đề bài:** gom activity thành session sau 30 phút im lặng; mobile offline gửi event muộn.

<details><summary>Gợi ý</summary>
Định nghĩa session merge/correction, watermark và mutable aggregate. So compute stream với query-time ClickHouse; lưu algorithm version.
</details>

### [DATA-12] Experiment metrics tránh đếm sai

**L4 · Analytics · exposure, attribution**

**Đề bài:** A/B test feed cần CTR, retention và guardrail; user có nhiều device, event duplicate và bot traffic.

<details><summary>Gợi ý</summary>
Stable subject assignment, exposure trước outcome, dedupe id, attribution window và sample-ratio-mismatch alert. Metric definition phải version/owner, không đổi giữa experiment.
</details>

### [DATA-13] Parquet data lake export

**L4 · Object storage/Parquet · partitioning, schema evolution**

**Đề bài:** xuất raw/curated events sang MinIO cho phân tích dài hạn mà không tạo hàng triệu small files.

<details><summary>Gợi ý</summary>
Partition time/domain, compaction, file size target, columnar compression và catalog. Schema evolution, encryption, retention, access policy và delete user lineage.
</details>

### [DATA-14] Backfill không phá realtime

**L4 · Data pipeline · replay, throttling**

**Đề bài:** rebuild Elasticsearch/ClickHouse từ hai năm event trong khi consumer realtime vẫn chạy.

<details><summary>Gợi ý</summary>
Tách resource/consumer group/topic hoặc snapshot+delta high-water mark. Rate limit, versioned target, shadow compare, checkpoint và atomic alias/cutover.
</details>

### [DATA-15] Data quality platform

**L5 · Governance · freshness, completeness, uniqueness**

**Đề bài:** phát hiện event mất, duplicate, schema drift và projection lệch trước khi Product thấy dashboard sai.

<details><summary>Gợi ý</summary>
Contract tests, count/checksum reconciliation, freshness/volume distribution, invariant query và ownership/runbook. Alert theo user impact, không tạo noise vô chủ.
</details>

### [DATA-16] Streaming disaster drill

**L5 · Recovery · RPO/RTO, replay**

**Đề bài:** Kafka mất một broker, connector dừng 12 giờ, consumer offset bị reset sai và DLQ tăng đột biến. Viết game day/runbook.

<details><summary>Tiêu chí hoàn thành</summary>
Detection, containment, decision tree, restore/replay, downstream capacity, duplicate safety, verification và communication. Đo RPO/RTO thực tế thay vì chỉ ghi trên tài liệu.
</details>
