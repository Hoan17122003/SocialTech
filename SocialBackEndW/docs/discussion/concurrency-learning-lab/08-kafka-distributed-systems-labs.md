# Kafka và hệ thống phân tán — 30 bài thực hành

Mỗi bài phải ghi rõ: key, partition, ordering scope, delivery semantics, retry/DLQ, schema, observability và recovery.

## A. Kiến thức nền tảng về Kafka

1. **J — Producer/consumer tối thiểu:** publish event envelope có id/type/version/time/correlation; graceful flush/close.
2. **J — Partition key:** gửi events nhiều user; kiểm tra ordering theo key, không hứa global ordering.
3. **J — Consumer group:** tăng consumer hơn số partition; giải thích idle consumer và scale ceiling.
4. **M — Manual offset:** process rồi commit; crash trước/sau commit và quan sát duplicate/loss.
5. **M — Batch consume:** batch size/wait, partial record failure, commit boundary và memory.
6. **M — Rebalance:** consumer xử lý lâu; cooperative shutdown, revoke callback, max poll interval và duplicate.
7. **M — Producer batching:** linger/batch/compression/acks; benchmark throughput, latency và durability.
8. **S — Partition expansion:** ordering/key mapping thay đổi khi tăng partition; kế hoạch migration cho keyed state.

## B. Các pattern bảo đảm độ tin cậy

9. **M — Idempotent consumer:** inbox/unique event id cùng business transaction; concurrent duplicate.
10. **M — Retry topics:** main→retry delays→DLQ; header attempts, backoff, poison event và ordering impact.
11. **M — Outbox relay:** Postgres outbox→Kafka; polling/locking, batch, duplicate và cleanup.
12. **M — DLQ replay:** inspect/fix/replay có audit, filter, rate limit và không tạo vòng lặp.
13. **M — Schema evolution:** add/remove/rename field; backward/forward compatibility và rolling consumers.
14. **S — Transactional Kafka:** thử transaction producer/read-process-write; nêu giới hạn khi side effect là DB/email.
15. **S — Disaster recovery:** broker outage dài hơn retention hoặc local backlog; RPO/RTO, restore và reconciliation.

## C. Luồng event trong SocialBackEnd

16. **M — Welcome email:** account created→email; duplicate, SMTP timeout sau khi đã nhận, template version và audit.
17. **M — Article indexing:** article event→Elasticsearch; out-of-order update/delete, entity version và rebuild index.
18. **M — Notification fan-out:** celebrity có triệu follower; chunk jobs, partitioning, rate limit và user preference.
19. **M — Chat side effects:** message persisted→summary/index/notification; per-conversation ordering và lag SLO.
20. **S — Feed fan-out:** fan-out-on-write/read hybrid; hot author, pagination, delete/edit propagation.
21. **S — User deletion:** orchestrate xóa nhiều stores; tombstone, retries, audit và late-arriving events.
22. **S — Counter projection:** likes/comments counts async; drift, monotonic/versioned updates và reconciliation.

## D. Tư duy về hệ thống phân tán

23. **M — Clock is not truth:** hai node clock skew; sort messages bằng server time, sequence hay hybrid; test skew.
24. **M — Network timeout ambiguity:** request timeout không chứng minh operation thất bại; idempotency/status query.
25. **M — Split brain cache/lock:** node mất kết nối nhưng tiếp tục ghi; fencing/version check tại resource.
26. **M — Consistent hashing:** shard conversations; thêm node, virtual nodes, hot keys và rebalance.
27. **S — Saga:** create community + media + notification; orchestration/choreography, compensations và audit state.
28. **S — CAP exercise:** với membership, chat, presence, feed, chọn consistency/availability khác nhau khi partition.
29. **S — Multi-region chat:** home region, replication lag, ordering, failover, conflict và latency budget.
30. **S — Chaos day:** kill consumer, delay DB, duplicate events, block broker, disk full; dashboard và runbook quyết định.

## Dashboard tối thiểu phải có

Produce rate/error/latency, consume rate/error/duration, consumer lag theo group/topic/partition, retry/DLQ rate, oldest event age, outbox backlog/age, rebalance count, payload size và business outcome. Không gắn user/event id vào metric label; dùng log/trace cho cardinality cao.

## Runbook khi consumer lag tăng

Xác nhận lag thật và phạm vi partition; so ingress/egress; kiểm tra poison/retry loop, rebalance, dependency latency, CPU/GC/network; tìm hot partition; giảm tác hại bằng pause/throttle/upscale phù hợp; không commit bỏ qua dữ liệu khi chưa có quyết định nghiệp vụ; sau phục hồi chạy reconciliation.
