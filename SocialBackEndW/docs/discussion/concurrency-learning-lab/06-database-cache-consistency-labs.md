# Database, Cache và tính nhất quán dữ liệu — 28 bài thực hành

Sau khi hoàn thành các bài kỹ thuật trong file này, hãy chuyển sang [10-database-feature-design-challenges.md](10-database-feature-design-challenges.md). Tài liệu đó cung cấp 30 đề bài tính năng mới để bạn tự phân tích nghiệp vụ, chọn công nghệ, thiết kế database và vẽ toàn bộ luồng xử lý.

## A. Transaction và isolation

1. **J — Unit of work:** tạo post + tags atomically; làm fail giữa chừng và chứng minh rollback.
2. **J — N+1:** phát hiện query comments/users; sửa projection/eager loading; đo SQL count và payload.
3. **M — Isolation anomalies:** dựng dirty/non-repeatable/phantom/lost update trên DB thật; ghi isolation nào ngăn gì.
4. **M — Conditional update:** decrement quota với `WHERE quota >= amount`; affected rows là kết quả cạnh tranh.
5. **M — Optimistic concurrency:** row version cho community settings; conflict UX, retry merge hay reject.
6. **M — Pessimistic lock:** giữ row lock có chủ đích; đo blocking/deadlock và timeout; so optimistic.
7. **M — Transaction scope:** không gọi email/HTTP khi giữ DB transaction; thiết kế handoff sau commit.
8. **S — Invariant xuyên aggregate:** community member count và membership rows; chọn derive, transactional counter hay async projection.

## B. Idempotency và delivery

9. **J — Duplicate command:** unique operation id + result persistence; concurrent duplicate không tạo hai post.
10. **M — Inbox:** consumer lưu event id cùng transaction với business change; cleanup/retention và partition key.
11. **M — Outbox:** lưu entity+event atomically, relay publish rồi mark; crash ở từng điểm và duplicate handling.
12. **M — Retry-safe email:** business event duplicate nhưng email không gửi vô hạn; định nghĩa dedupe window và audit.
13. **S — Exactly-once debate:** liệt kê boundary DB/Kafka/email; chứng minh “effectively once” bằng idempotency thay vì khẩu hiệu.
14. **S — Reconciliation:** job so source of truth với projection/index và sửa drift an toàn, có dry-run.

## C. Cache

15. **J — Cache-aside:** profile read, TTL, miss, invalidation khi update; nêu stale window.
16. **M — Stampede:** single-flight + TTL jitter + stale fallback; benchmark hot-key expiry.
17. **M — Negative cache:** user không tồn tại; TTL ngắn, tránh cache poisoning và vấn đề create ngay sau đó.
18. **M — Versioned key:** schema/cache payload đổi trong rolling deploy; namespace version và migration.
19. **M — Distributed invalidation:** pub/sub message có thể mất; TTL là safety net, source of truth vẫn là DB.
20. **M — Write-through/behind:** so latency, failure semantics và data-loss risk với cache-aside.
21. **S — Hot key:** celebrity post; local+distributed cache, request coalescing, sharding counter và approximate result.
22. **S — Cache consistency:** user bị ban nhưng authz cache cũ; security-sensitive TTL/invalidation khác content cache.

## D. Query và data modeling

23. **M — Keyset pagination:** feed theo `(createdAt,id)`; không duplicate/skip khi timestamps trùng.
24. **M — Index design:** query membership theo community/status/user; đọc execution plan, selectivity, write cost.
25. **M — Batch write:** insert notifications theo chunk; giới hạn parameter, transaction size và partial failure.
26. **S — CQRS projection:** Kafka events cập nhật Elasticsearch/feed count; lag, rebuild và schema version.
27. **S — Cassandra chat:** partition theo conversation/time bucket; tránh unbounded partition, tombstones và hot partition.
28. **S — Data retention:** xóa user xuyên Postgres/MinIO/Cassandra/Elastic/Kafka; audit, legal retention và retry/reconciliation.

## Câu hỏi review repository

- Query có materialize sớm, tracking thừa, N+1 hoặc client evaluation không?
- DbContext có bị dùng đồng thời không? Transaction boundary nằm đúng use case không?
- Constraint ở DB có bảo vệ invariant cuối cùng không?
- Retry transaction có chạy lại toàn delegate và side effect có idempotent không?
- Index phục vụ query thật hay chỉ “có vẻ hữu ích”? Đã xem execution plan chưa?
