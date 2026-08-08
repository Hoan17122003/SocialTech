# Thực hành ASP.NET Core trong môi trường production — 28 bài

## A. Luồng xử lý request và DI

1. **J — Pipeline map:** trace thứ tự middleware, authentication, authorization, endpoint, exception handling; thử short-circuit.
2. **J — Scoped lifetime:** chứng minh DbContext scoped; tạo lỗi khi singleton giữ scoped service và giải thích captive dependency.
3. **M — Correlation middleware:** nhận/tạo trace id, structured logging, response header; tránh log PII/token.
4. **M — Request body limit:** chặn payload theo content length và streaming limit; xử lý chunked request.
5. **M — Cancellation:** truyền `HttpContext.RequestAborted` đến service/EF/HTTP; phân biệt client abort với server timeout.
6. **S — Multi-tenant context:** resolve tenant an toàn, scope đúng, cache key/index chứa tenant và chống data leak.

## B. API correctness và resilience

7. **J — Idempotent create:** nhận idempotency key, cùng key+cùng payload trả cùng kết quả; khác payload trả conflict.
8. **M — Optimistic API:** ETag/If-Match cho update profile; trả 412/409 hợp lý.
9. **M — Outbound HTTP:** `IHttpClientFactory`, timeout, cancellation, connection reuse; không tạo `HttpClient` mỗi request.
10. **M — Retry policy:** chỉ retry transient/idempotent operation, exponential backoff+jitter, budget và metrics.
11. **M — Circuit breaker:** dependency Gemini lỗi; fallback rõ ràng, half-open probe và tránh breaker toàn cục sai scope.
12. **S — Bulkhead:** giới hạn concurrent call riêng cho Gemini/email để một dependency không kéo sập API.

## C. Công việc chạy nền

13. **J — `BackgroundService`:** periodic cleanup bằng `PeriodicTimer`; cancellation và exception không làm loop im lặng chết.
14. **M — Bounded queue:** endpoint enqueue side effect, worker drain; queue full policy và graceful shutdown.
15. **M — Scoped work item:** worker tạo DI scope cho từng/batch job; DbContext không dùng đồng thời.
16. **M — Retry queue:** delayed retry, max attempts, poison item và dead-letter store.
17. **S — Durable handoff:** chứng minh in-memory queue mất việc khi crash; chuyển sang outbox/Kafka và định nghĩa delivery semantics.
18. **S — Rolling deploy:** hai version worker cùng chạy; event/schema backward compatible và shutdown không duplicate nguy hiểm.

## D. Realtime, security và observability

19. **M — SignalR group:** authorize join conversation; reconnect và multi-node backplane; không tin group id từ client.
20. **M — Slow client:** outbound queue bounded; drop/disconnect/coalesce policy và metric queue lag.
21. **M — Rate limit:** policy theo IP/user/route; proxy headers đáng tin; trả headers/429 và tránh memory blow-up.
22. **M — Upload security:** MIME sniffing, extension, max bytes, filename, malware workflow, object key ngẫu nhiên.
23. **M — Health checks:** liveness không phụ thuộc remote DB; readiness phản ánh khả năng nhận traffic; startup probe.
24. **M — Metrics:** RED (rate/errors/duration), queue depth, consumer lag; histogram buckets và cardinality.
25. **M — Tracing:** span API→DB→Kafka publish; baggage tối thiểu; correlation giữa producer/consumer.
26. **S — Overload drill:** làm DB chậm 10×; theo dõi pool, queue, p99, timeout cascade; thêm shedding/bulkhead.
27. **S — Zero-downtime migration:** expand/migrate/contract; old/new app cùng hoạt động; rollback trước contract.
28. **S — Incident exercise:** API p99 tăng nhưng CPU thấp. Viết triage: saturation dependency, pool starvation, locks, network, GC và bằng chứng cần lấy.

## Bài áp dụng trực tiếp codebase

Review `ChatMessageSideEffectQueue/Worker`, Kafka consumer, cache adapter và media controller theo checklist: queue bounded? service lifetime đúng? exception có quan sát? shutdown có drain? idempotent? cancellation tới cuối? metric lag/depth? Sau review chỉ viết đề xuất; triển khai từng thay đổi kèm regression/load test riêng.
