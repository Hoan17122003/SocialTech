# Playbook thiết kế database và chọn công nghệ

## 1. Luồng tư duy 14 bước

1. Viết use case và actor; không bắt đầu bằng tên database.
2. Chốt invariant, permission và trạng thái hợp lệ.
3. Liệt kê command/query; tần suất, sort/filter, payload, cardinality và growth.
4. Chọn source of truth và aggregate/transaction boundary.
5. Mô hình identity, relationships, ownership, history và deletion.
6. Thiết kế schema tối giản bảo vệ invariant bằng PK/FK/UNIQUE/CHECK/NOT NULL.
7. Thiết kế query shape trước index; dùng dữ liệu phân bố thật để kiểm tra selectivity.
8. Xác định concurrency: lost update, duplicate, last-owner, quota, stale projection.
9. Vẽ boundary DB/cache/broker/search/object store và dual-write gaps.
10. Định nghĩa idempotency, ordering, retry, replay và reconciliation.
11. Ước lượng storage/IOPS/bandwidth/connections/partition size/retention.
12. So sánh tối thiểu ba phương án, gồm baseline không thêm công nghệ.
13. Thiết kế expand–migrate–verify–contract, canary và rollback.
14. Đặt metrics/data-quality checks/runbook rồi mới production rollout.

## 2. Technology decision matrix

| Công nghệ | Phù hợp khi | Không nên dùng khi | Bài toán SocialBackEnd điển hình |
|---|---|---|---|
| MySQL/EF Core | transaction, relation, constraint, moderate scale | graph traversal sâu, analytics scan lớn | user/community/post/vote/report/outbox |
| PostgreSQL | cần SQL mạnh, JSONB, generated/partial index | chỉ đổi DB vì xu hướng | có thể làm target so sánh/POC |
| PostGIS | query khoảng cách/vùng địa lý chính xác | chỉ lưu city string | nearby communities/events, geo moderation |
| Redis | ephemeral/cache/counter/rate limit/lease | source of truth duy nhất cho dữ liệu bền | sessions, presence, single-flight, hot counters |
| Cassandra/ScyllaDB | write/time-ordered data theo known partition key | joins/ad-hoc query/global scan | chat history, high-volume activity log |
| Elasticsearch/OpenSearch | full-text, relevance, faceting, geo search | transactional truth/counter chính xác | post/user/community/chat search |
| Neo4j/graph DB | multi-hop relationship/path/fraud graph | simple follow lookup 1 hop | people-you-may-know, trust/fraud rings |
| pgvector/Elasticsearch vector/Qdrant | semantic nearest-neighbor | chưa có embedding quality/corpus | semantic post/community/chat search |
| Kafka | durable async log, decoupling, replay | synchronous request/response nhỏ | outbox stream, notification, projections |
| Debezium CDC | capture committed DB changes without service coupling | team chưa vận hành binlog/connect | outbox relay, analytics feed |
| Kafka Streams/Flink | stateful windows/joins/late events | batch nhỏ mỗi ngày | trending, anomaly, realtime aggregates |
| ClickHouse | OLAP append-heavy, large scans/aggregations | OLTP mutations/transactions | product/security/moderation analytics |
| Object storage + Parquet | cheap immutable archive/data lake | low-latency point writes/updates | chat archive, exports, analytics history |
| MongoDB/document DB | aggregate documents/schema-flexible reads | cross-document invariants/joins quan trọng | drafts/config snapshots POC only |

## 3. Gate trước khi thêm database/service mới

Phải trả lời được tất cả:

- Query/workload nào hiện tại không đạt SLO? Có baseline và số đo?
- Công nghệ mới giải quyết bottleneck nào bằng đặc tính cốt lõi, không phải bằng marketing?
- Dữ liệu nào authoritative; sync/rebuild/reconcile ra sao?
- Team vận hành backup, upgrade, security, monitoring, capacity và incident thế nào?
- Migration/cutover/rollback và dual-write period?
- Chi phí local/dev/CI/production và vendor lock-in?
- Ngưỡng thành công/thất bại của POC và kế hoạch gỡ bỏ?

## 4. Mẫu task card

```md
### [PREFIX-NN] Tên task
**Level · Category · Keywords · N hướng · Evidence/điểm chạm source**
**Problem / invariant / deliverable**
<details><summary>Phân rã + các hướng/công nghệ + trade-off</summary>...</details>
<details><summary>Junior / Middle / Senior + test/rollout</summary>...</details>
```

## 5. Junior, Middle, Senior nhìn schema khác nhau thế nào

- **Junior:** bảng/cột/CRUD đúng kiểu dữ liệu và navigation.
- **Middle:** constraint, query/index, transaction/concurrency, migration/test và data growth.
- **Senior:** business invariant và source of truth; workload/capacity; multi-store failure; online rollout/recovery; ownership/cost/governance. Senior có thể chủ động không thêm công nghệ nếu complexity lớn hơn lợi ích.

## 6. Deliverable tiêu chuẩn

`problem.md`, ERD/data-flow, DDL/EF migration, seed/fixture cũ, unit+integration+concurrent test, `EXPLAIN ANALYZE`, load/chaos result, ADR options/decision, migration/runbook và dashboard/data-quality query. Với POC công nghệ mới, thêm destroy/rebuild script và comparison table với baseline.
