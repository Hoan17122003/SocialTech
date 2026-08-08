# SocialBackEnd Practice & Interview Tasking

> Bộ task thực chiến chỉ dành cho domain của SocialBackEnd. Mỗi task có đề bài mở và phần gợi ý gập bằng `<details>` để bạn suy nghĩ trước khi xem hướng giải quyết.

## Cách học

1. Chỉ đọc phần đang mở: bối cảnh, phạm trù, keyword, invariant và yêu cầu.
2. Viết design note 15–30 phút: assumptions, luồng dữ liệu, failure modes, ít nhất 2 phương án.
3. Tự code và test trước khi mở `Gợi ý phân rã`.
4. Chỉ mở `Các hướng xử lý` khi đã bị kẹt; không sao chép nguyên mẫu.
5. Sau khi xong, mở `Junior / Middle / Senior` để tự chấm độ sâu tư duy.
6. Chạy test lỗi, concurrent test hoặc load test theo Definition of Done rồi viết postmortem ngắn.

## Bản đồ

- [00-task-card-guide.md](00-task-card-guide.md): mẫu task, taxonomy và luật tự chấm.
- [01-core-async-concurrency.md](01-core-async-concurrency.md): async, ThreadPool, cancellation, queue và graceful shutdown.
- [02-community-membership.md](02-community-membership.md): community, membership, role, rule, invite và audit.
- [03-post-feed-engagement.md](03-post-feed-engagement.md): post, feed, vote, save, tag, ranking và moderation.
- [04-auth-account-security.md](04-auth-account-security.md): login, token, session, reset password, abuse và authorization.
- [05-chat-realtime.md](05-chat-realtime.md): SignalR, Cassandra, Elasticsearch, ordering, presence và slow client.
- [06-media-file-streaming.md](06-media-file-streaming.md): MinIO, upload, range, resumable, virus scan và orphan cleanup.
- [07-notification-kafka.md](07-notification-kafka.md): notification, email, Kafka, outbox/inbox, retry và DLQ.
- [08-data-cache-performance.md](08-data-cache-performance.md): EF Core/MySQL, Redis, cache, query, performance và reconciliation.
- [09-capstone-roadmap.md](09-capstone-roadmap.md): feature roadmap, capstone và lộ trình phỏng vấn.

Hiện bộ này có **114 task card triển khai + 10 capstone tích hợp = 124 tình huống**, từ L1/L2 đến L5. Mỗi task có 2 khối gập: hướng phân rã/các phương án và cách nghĩ theo level/test kiểm chứng.

## 10 task nên bắt đầu ngay trên code hiện tại

1. `CORE-02`: bỏ `.Result/GetAwaiter().GetResult()` trên request path.
2. `CORE-05`: đổi chat side-effect queue unbounded thành bounded có policy.
3. `COM-01`: tạo community + owner atomically.
4. `COM-03`: join/approve/ban theo state machine.
5. `POST-03`: sửa parent/depth của comment tree.
6. `POST-06`: vote desired-state race-safe.
7. `AUTH-04`: reset password token single-use dưới concurrent request.
8. `CHAT-03`: giữ nguyên MessageId khi rehydrate Cassandra/Elastic.
9. `MEDIA-03`: stream download, không buffer toàn object.
10. `EVT-07`: transactional outbox cho create user/article.

Lý do chọn: đây là các task vừa có lỗi/gap nhìn thấy trong code, vừa tạo câu chuyện phỏng vấn mạnh về async, invariant, race, transaction và distributed consistency.

## Hiện trạng codebase được dùng làm baseline

Ứng dụng đang có ASP.NET Core 8, EF Core/MySQL, Redis, Kafka, SignalR, Cassandra, Elasticsearch, MinIO, email và Gemini moderation. Các domain entity đã có gồm user/follow, community/membership/rule, post/comment/vote/report, notification, attachment và chat conversation/message. Bộ task ưu tiên mở rộng những điểm hiện hữu thay vì dựng một hệ thống khác.

Các seam nên luyện trực tiếp: `CommunityMembershipRepository`, `ArticleAdapterPort`, `UserAdapaterPort`, `AuthenticationAdapter`, `ChatAdapter`, `ChatMessageSideEffectQueue/Worker`, `KafkaEventConsumer/Publisher`, `CacheAdapter`, `MinioEntityMediaStorageService`, `MediaController` và các EF configurations.

Đọc lý thuyết nền song song tại [`../../concurrency-learning-lab/README.md`](../../concurrency-learning-lab/README.md); bộ hiện tại là lớp bài tập domain-specific, không thay thế bộ lab nền tảng đó.

## Quy ước độ khó

- **L1 – Junior:** một request/một process, happy path rõ, học API và test cơ bản.
- **L2 – Junior+:** validation, authorization, cancellation, pagination và lỗi nghiệp vụ.
- **L3 – Middle:** concurrent requests, transaction, idempotency, bounded resource, observability.
- **L4 – Middle+:** multi-instance, queue/broker, eventual consistency, retry/recovery, load test.
- **L5 – Senior-ready:** capacity, failure injection, migration/rollout, reconciliation, security và trade-off định lượng.

## Definition of Done chung

- Nêu rõ source of truth, invariants và transaction/consistency boundary.
- Cancellation/timeout truyền tới I/O; không dùng fire-and-forget không quan sát.
- Queue, batch, concurrency, payload và retry đều có giới hạn.
- Có test happy path, authorization, duplicate/concurrent và recovery khi phù hợp.
- Có structured log/correlation id; task L3+ có metrics hoặc trace.
- Có migration/rollout/rollback nếu đổi schema hoặc event contract.
- README của bài ghi ít nhất 2 phương án bị loại và lý do.
