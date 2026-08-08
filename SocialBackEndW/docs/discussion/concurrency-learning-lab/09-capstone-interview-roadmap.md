# Đồ án tổng hợp, lộ trình học và luyện tập phỏng vấn

## 1. Sáu đồ án tổng hợp thực chiến

### Đồ án A — Luồng xử lý notification

API tạo notification + outbox; Kafka relay; consumer email/in-app; inbox dedupe; retry/DLQ; cấu hình người dùng; metric/trace. Bài kiểm tra lỗi: database đã commit rồi ứng dụng crash, SMTP timeout sau khi đã chấp nhận email, event bị lặp và broker ngừng hoạt động. Mục tiêu: không mất event nghiệp vụ và side effect lặp lại được kiểm soát.

### Đồ án B — Tiếp nhận và xử lý media

Resumable upload trực tiếp object storage; checksum; quarantine/scan; metadata worker; thumbnail CPU pipeline; lifecycle cleanup. Giới hạn bytes/chunks/concurrency, client cancellation và progress. Load test nhiều file lớn mà memory process ổn định.

### Đồ án C — Chat realtime

Persist message, per-conversation sequence, SignalR fan-out, slow-client policy, Kafka side effects, Cassandra storage, Elasticsearch index, edit/delete version. Test reconnect, duplicate/out-of-order và rolling deploy.

### Đồ án D — Thành viên community và voting

State machine role/status, unique constraints, optimistic concurrency, concurrent join/ban/leave, idempotency, audit log, permission cache invalidation. Viết deterministic race tests và DB deadlock retry.

### Đồ án E — Import dữ liệu và backfill

Import CSV triệu dòng bằng streaming; validate/enrich; bounded pipeline; batch DB; checkpoint/resume; DLQ report; pause/throttle; reconciliation. Crash ở mọi boundary mà không skip record.

### Đồ án F — Feed có lưu lượng lớn

Hybrid fan-out, Kafka projection, cache, keyset pagination, celebrity/hot-key handling, delete/edit, lag visibility và rebuild. Đặt SLO và capacity plan trước khi code.

## 2. Lộ trình 16 tuần

- **Tuần 1–2:** lab 02 phần A–C; nhật ký thread/task/cancellation.
- **Tuần 3–4:** lab 03; mỗi bug race/deadlock phải có deterministic test.
- **Tuần 5–6:** lab 04; BenchmarkDotNet, counters, load test và báo cáo p95/p99.
- **Tuần 7–8:** lab 05; background queue, DI lifetime, resilience/observability.
- **Tuần 9–10:** lab 06; isolation, concurrency token, idempotency, outbox/cache.
- **Tuần 11–12:** lab 07; streaming upload/CSV/batch/checkpoint.
- **Tuần 13–14:** lab 08; Kafka delivery, ordering, retry/DLQ/schema/rebalance.
- **Tuần 15–16:** chọn hai capstone; chaos drill, design review và mock interview.

Nhịp mỗi tuần: 20% đọc, 50% code/test, 20% đo/điều tra, 10% viết design note/postmortem.

## 3. Bộ câu hỏi phỏng vấn Junior → Middle

### Kiến thức cốt lõi C#/.NET

1. Task khác Thread thế nào? `async` có tạo thread không?
2. Khi nào dùng `Task.Run`, `Parallel.ForEachAsync`, `IAsyncEnumerable`?
3. `ConfigureAwait` có ý nghĩa gì và ASP.NET Core khác UI app ra sao?
4. Vì sao DbContext không thread-safe? DI lifetime nào phù hợp?
5. `IDisposable`/`IAsyncDisposable`; finalizer không thay thế deterministic cleanup vì sao?
6. Value/reference type, boxing, closure allocation ảnh hưởng hiệu năng thế nào?
7. GC generations, LOH, allocation rate và pause liên quan ra sao?
8. `Span<T>`, pooling và zero-copy có trade-off gì?

### Concurrency

9. Phân biệt race condition, data race, deadlock, livelock, starvation.
10. `lock`, `Monitor`, `Interlocked`, `SemaphoreSlim`, mutex dùng khi nào?
11. `ConcurrentDictionary` có làm toàn bộ chuỗi thao tác thread-safe không?
12. Làm sao test race deterministic? Làm sao điều tra deadlock production?
13. Vì sao lock in-memory không bảo vệ nhiều app instances?
14. Backpressure là gì? Queue unbounded nguy hiểm thế nào?
15. Cancellation và timeout khác nhau ra sao?

### ASP.NET/data/distributed

16. Request lifecycle và middleware order ảnh hưởng security/error ra sao?
17. Optimistic vs pessimistic concurrency; isolation levels và lost update.
18. Cache-aside có race/invalidation/stampede gì?
19. Idempotency key được lưu và xử lý concurrent request thế nào?
20. Kafka partition quyết định ordering và scalability ra sao?
21. At-most-once/at-least-once/exactly-once; side effect ngoài Kafka thì sao?
22. Outbox/inbox giải quyết boundary nào và không giải quyết gì?
23. Retry khi nào làm tình hình tệ hơn? Jitter/budget/DLQ có vai trò gì?
24. Average latency tốt nhưng p99 xấu nói lên điều gì?
25. Thiết kế upload 10 GB không làm đầy RAM/disk tạm thế nào?

## 4. Cách trả lời phỏng vấn có chiều sâu

Dùng cấu trúc: **definition → concrete example → failure/trade-off → production decision → evidence**. Ví dụ không chỉ nói “dùng lock”, mà nêu invariant, scope/lifetime của lock, critical section, async/multi-node limitation và test chứng minh.

Với system design: làm rõ yêu cầu; ước lượng tải; xác định API và data model; vẽ luồng tổng thể; đào sâu bottleneck; phân tích tính nhất quán và tình huống lỗi; thiết kế observability, bảo mật và rollout. Nói rõ assumption và thay đổi thiết kế khi người phỏng vấn thay đổi constraint.

## 5. Rubric capstone 100 điểm

- Tính đúng đắn và invariant: 20
- Concurrency, idempotency và ordering: 15
- Khôi phục lỗi, cancellation và timeout: 15
- Giới hạn tài nguyên, backpressure và capacity: 15
- Bằng chứng từ test, load test và chaos test: 15
- Observability và runbook: 10
- Bảo mật và quyền riêng tư dữ liệu: 5
- Tài liệu thiết kế, trade-off và rollout: 5

Từ 70: Middle foundation tốt. Từ 85: có tín hiệu senior-ready nếu tự giải thích và tự chứng minh được, không chỉ sao chép pattern.

## 6. Cách dùng AI mà không mất năng lực suy nghĩ

Vòng 1 tự viết assumptions/invariants và solution trong 30–60 phút. Vòng 2 yêu cầu AI đóng vai reviewer, chỉ hỏi câu phản biện, chưa đưa lời giải. Vòng 3 xin hint theo tầng. Vòng 4 tự code/test. Vòng 5 nhờ review diff theo correctness/failure/measurement. Cuối cùng tự viết lại quyết định mà không nhìn câu trả lời.
