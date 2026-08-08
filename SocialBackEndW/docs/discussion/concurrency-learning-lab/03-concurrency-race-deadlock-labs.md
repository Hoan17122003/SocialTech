# Concurrency, Race Condition, Deadlock — 28 lab

Trước mỗi bài, viết invariant và interleaving tối thiểu gây lỗi. Test phải điều phối được interleaving, không phụ thuộc may rủi.

## A. Race condition và atomicity

1. **J — Lost increment:** nhiều Task tăng counter; so `++`, `lock`, `Interlocked`; giải thích atomicity và visibility.
2. **J — Check-then-act:** `if (!dict.ContainsKey) Add`; làm lỗi rồi sửa bằng API atomic của `ConcurrentDictionary`.
3. **J — Bank transfer:** hai account và invariant tổng tiền; tạo race, sửa lock ordering; không giữ lock khi gọi I/O.
4. **M — Membership uniqueness:** hai request join cùng community. Chặn ở code có đủ không? Thêm unique constraint và xử lý conflict.
5. **M — Double vote:** concurrent upvote/downvote/remove; model state transition và transaction để score khớp rows.
6. **M — Unsafe publication:** object bị đọc khi chưa khởi tạo hoàn chỉnh; nghiên cứu immutability, static initialization, `Lazy<T>`.
7. **M — ABA/versioning:** update profile dựa trên bản cũ; thêm version/concurrency token và trả conflict có ý nghĩa.
8. **S — Linearizable counter:** xây API increment/read, định nghĩa linearization point; so DB atomic update, Redis và event log.

## B. Synchronization primitives

9. **J — Mutex catalog:** implement cùng invariant bằng `lock`, `SemaphoreSlim`, `ReaderWriterLockSlim`; benchmark read/write ratios.
10. **J — Producer/consumer:** bounded `Channel<T>` với nhiều producer/consumer; chọn wait/drop policy và complete đúng cách.
11. **M — Async lock:** chứng minh không được `await` trong `lock`; dùng `SemaphoreSlim`, xử lý reentrancy/cancellation.
12. **M — Rate limiter:** token bucket cho user/IP; thread-safe, clock abstraction, burst capacity và distributed limitation.
13. **M — Snapshot config:** nhiều reader, ít writer; immutable snapshot + atomic swap; không expose mutable collection.
14. **S — Keyed locking:** serialize theo `conversationId`, song song giữa conversation; giải bài toán dọn lock và cardinality vô hạn.
15. **S — Actor/mailbox:** mỗi community một mailbox xử lý tuần tự; so actor với shared-state locking về ordering, memory và recovery.

## C. Deadlock, livelock, starvation

16. **J — Hai chiếc đũa:** tạo deadlock hai lock; vẽ wait-for graph và bốn điều kiện Coffman; sửa global lock order.
17. **M — Async deadlock:** task A chờ signal từ B trong khi giữ semaphore B cần; thu thread dump/timeline rồi sửa scope.
18. **M — DB deadlock:** hai transaction update post/comment theo thứ tự ngược; retry toàn transaction có jitter và idempotency.
19. **M — Thread starvation:** queue nhiều blocking work làm health endpoint chậm; theo dõi ThreadPool counters.
20. **M — Writer starvation:** workload đọc liên tục; đánh giá fairness của reader/writer design.
21. **M — Livelock:** hai worker liên tục nhường nhau; thêm randomized backoff và retry budget.
22. **S — Distributed lock expiry:** worker pause quá lease rồi vẫn ghi. Dùng fencing token; giải thích vì sao renew lease chưa đủ tuyệt đối.

## D. Tình huống trong SocialBackEnd

23. **M — Mark notification read:** endpoint gọi lặp/concurrent vẫn idempotent; update có điều kiện và metric affected rows.
24. **M — Follow/unfollow:** request đảo thứ tự trên mạng; chọn last-write-wins, command version hay desired-state API.
25. **M — Cache stampede:** hot post hết TTL; single-flight, stale-while-revalidate, TTL jitter và failure fallback.
26. **S — Conversation sequence:** cấp sequence message theo conversation dưới nhiều node; đánh đổi DB sequence, Redis, Kafka partition.
27. **S — Moderation race:** moderator approve trong lúc tác giả delete; state machine, permitted transitions và audit log.
28. **S — Presence registry:** connect/disconnect/reconnect đến lệch thứ tự; session id, lease/heartbeat và cleanup.

## Danh sách kiểm tra khi review concurrency

- Shared state ở đâu, owner là ai, invariant nào cần bảo vệ?
- Primitive có cùng lifetime với state không?
- Critical section có bounded và không chứa network/disk I/O không?
- Lock order có nhất quán? Callback có chạy trong lock?
- Cancellation/exception có làm quên release/complete không?
- Correctness có dựa vào timing, clock cục bộ hay “request thường đến đúng thứ tự” không?
- Multi-instance có làm cho in-memory lock vô nghĩa không?
