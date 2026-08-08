# SocialBackEnd — Bộ đề Database nâng cao và tính năng mới

> Bộ đề bài mở rộng từ source thật của SocialBackEnd: database design, polyglot persistence, feature mới, migration, maintenance, bug fixing, performance, data platform và disaster recovery. Phần hướng giải quyết nằm trong `<details>` để bạn tự thiết kế trước.

## Mục tiêu

Không học công nghệ theo kiểu “thêm cho đủ stack”. Mỗi task buộc trả lời: workload/vấn đề nào đang có; invariant/SLO nào cần giữ; MySQL hiện tại có đủ không; công nghệ mới giải quyết giới hạn cụ thể nào; chi phí consistency, vận hành, migration và rollback là gì.

## Bản đồ tài liệu

**Trạng thái:** đã hoàn thành đầy đủ chuỗi tài liệu từ `00` đến `11`.

- [00-database-technology-playbook.md](00-database-technology-playbook.md): cách thiết kế schema và chọn công nghệ như Senior.
- [01-source-audit-maintenance-bugfix.md](01-source-audit-maintenance-bugfix.md): lỗi/rủi ro được xác nhận trực tiếp từ source và migrations.
- [02-relational-model-integrity.md](02-relational-model-integrity.md): aggregate, constraint, history, ledger và feature schema mới.
- [03-query-index-pagination-performance.md](03-query-index-pagination-performance.md): query shape, index, cursor, counter, partition và read scale.
- [04-transaction-concurrency-consistency.md](04-transaction-concurrency-consistency.md): isolation, race, transaction, outbox/inbox, saga và reconciliation.
- [05-polyglot-cache-nosql-storage.md](05-polyglot-cache-nosql-storage.md): Redis, Cassandra/Scylla, Elasticsearch/OpenSearch, document/object/time-series stores.
- [06-social-graph-recommendation-geo.md](06-social-graph-recommendation-geo.md): Neo4j/graph, recommendation, fraud graph và geospatial.
- [07-search-vector-ai-features.md](07-search-vector-ai-features.md): search tiếng Việt, semantic/vector search, moderation, RAG và embedding lifecycle.
- [08-streaming-cdc-analytics-olap.md](08-streaming-cdc-analytics-olap.md): Kafka, Debezium CDC, stream processing, ClickHouse/lakehouse và experimentation.
- [09-chat-media-data-lifecycle.md](09-chat-media-data-lifecycle.md): chat/media data model, buckets, archive, retention và multi-store recovery.
- [10-migration-governance-security-dr.md](10-migration-governance-security-dr.md): zero-downtime migration, data governance, backup/restore và DR.
- [11-advanced-capstone-roadmap.md](11-advanced-capstone-roadmap.md): capstone, thứ tự triển khai và cách kể kinh nghiệm phỏng vấn.

## Baseline đã quét

ASP.NET Core 8; EF Core/MySQL; Redis; Kafka; Cassandra; Elasticsearch; MinIO; SignalR; email OAuth2 và Gemini. Việc rà soát bao phủ `Domain/Entities`, toàn bộ EF configurations/repositories, migrations/model snapshot, Kafka/cache/chat/media adapters, DI, Docker Compose và các application services.

## Cách làm một task

1. Chỉ đọc phần mở: vấn đề, bằng chứng source, level, category, keyword và invariant.
2. Viết schema/query/data-flow cùng ba failure scenarios trước khi mở gợi ý.
3. Đưa ra baseline dùng stack hiện tại và ít nhất hai phương án khác.
4. Chỉ thêm công nghệ nếu có số đo hoặc constraint chứng minh MySQL/stack hiện tại không đủ.
5. Nộp migration up/down hoặc expand/contract, test với dữ liệu cũ, concurrency/failure test, `EXPLAIN` khi có query và rollback note.

## Tiêu chuẩn hoàn thành

- Source of truth và ownership từng field/store rõ ràng.
- Constraint bảo vệ invariant ở tầng thấp nhất phù hợp; application validation không phải hàng rào duy nhất.
- Schema hỗ trợ query thật; index có execution-plan evidence.
- State/history/idempotency/ordering/retention được định nghĩa.
- Migration tương thích old/new version; có verify và rollback/forward-fix.
- Công nghệ mới có capacity/cost/operability assessment và đường loại bỏ nếu thử nghiệm thất bại.
- Có metric data quality/lag/drift, reconciliation hoặc runbook cho task L4+.

## Quy ước level

- **L1:** schema/CRUD/query cơ bản.
- **L2:** constraint, projection, pagination, migration nhỏ.
- **L3:** concurrency, isolation, indexing, cache, audit và failure handling.
- **L4:** nhiều process/store, CDC/streaming, scale, online migration và recovery.
- **L5:** architecture/capacity/governance/DR, multi-region hoặc platform-level decision.

## Lưu ý công nghệ

Các đề có thể yêu cầu proof-of-concept với PostgreSQL/PostGIS/pgvector, Neo4j, ClickHouse, MongoDB, ScyllaDB, Qdrant/Milvus, Debezium, Kafka Streams/Flink, Parquet/lakehouse hoặc workflow engine. Đây là lựa chọn để so sánh, không phải yêu cầu đưa tất cả vào production.
