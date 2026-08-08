# Transaction, Concurrency và tính nhất quán dữ liệu

Quy tắc: trước khi chọn `lock`, isolation level hay message broker, phải viết invariant, mọi interleaving nguy hiểm và ranh giới atomicity thực sự cần thiết.

### [TX-01] Join community không vượt sức chứa

**L3 · MySQL/EF Core · conditional update, unique constraint · CommunityMembership**

**Đề bài:** hai trăm request cùng join community chỉ còn mười chỗ; user bị ban không được tham gia. Thiết kế schema và transaction để không vượt `MemberLimit`, không tạo membership trùng và retry an toàn.

<details><summary>Gợi ý tư duy Senior</summary>
So sánh đếm rồi insert, khóa row community, conditional counter và derive count. Xác định lock order, isolation, affected rows, deadlock retry và cách reconciliation nếu counter lệch. Test bằng barrier, không dùng delay ngẫu nhiên.
</details>

### [TX-02] Vote state machine dưới request đồng thời

**L3 · MySQL · upsert, optimistic concurrency · PostVote/Post**

**Đề bài:** cùng user gửi upvote, downvote và remove gần như đồng thời; score cuối phải khớp vote rows. Hãy định nghĩa state transition, API desired-state và transaction boundary.

<details><summary>Gợi ý</summary>
Một unique key `(PostId,UserId)` bảo vệ identity nhưng chưa bảo vệ counter. So sánh tính score khi đọc, atomic delta và ledger/projection. Xử lý request cũ đến sau bằng command version nếu business cần ordering.
</details>

### [TX-03] Moderator xử lý cùng một membership request

**L3 · Optimistic concurrency · state machine, audit**

**Đề bài:** hai moderator đồng thời approve/reject, trong lúc user cancel. Chỉ transition hợp lệ đầu tiên được commit và mọi quyết định phải có audit.

<details><summary>Gợi ý</summary>
Dùng concurrency token hoặc conditional `UPDATE ... WHERE Status = Pending`; audit row phải cùng transaction. Trả conflict có current state; không tự retry quyết định nghiệp vụ mâu thuẫn.
</details>

### [TX-04] Follow/unfollow bị đảo thứ tự

**L3 · API contract · idempotency, ordering**

**Đề bài:** mobile offline gửi follow rồi unfollow nhưng network giao ngược thứ tự. Thiết kế contract để trạng thái cuối phản ánh ý định mới nhất.

<details><summary>Gợi ý</summary>
So sánh command thao tác, desired-state `PUT/DELETE`, client sequence và server version. Idempotency chống duplicate không tự giải quyết out-of-order.
</details>

### [TX-05] Idempotency ledger cho create API

**L3 · API/MySQL · idempotency key, payload hash**

**Đề bài:** tạo post timeout sau commit nên client retry. Cùng key và payload phải trả cùng kết quả; cùng key nhưng payload khác phải conflict; hai request cùng key có thể chạy đồng thời.

<details><summary>Gợi ý</summary>
Thiết kế trạng thái Processing/Completed/Failed, unique scope, request hash, response snapshot, TTL và ownership. Phân tích crash sau reserve, trước/ sau business commit; cân nhắc lưu ledger cùng transaction.
</details>

### [TX-06] Outbox đóng dual-write gap

**L4 · MySQL/Kafka · transactional outbox**

**Đề bài:** tạo article và publish `ArticleCreated` mà không mất event khi process crash. Thiết kế outbox schema, relay nhiều instance, batch claim, retry và cleanup.

<details><summary>Gợi ý</summary>
Event và aggregate commit cùng transaction. Relay có thể publish trùng nếu crash sau publish trước mark; consumer phải idempotent. Đo oldest outbox age, backlog, attempt và poison rows; tránh giữ DB lock lúc gọi Kafka.
</details>

### [TX-07] Inbox cho consumer notification

**L4 · Kafka/MySQL · at-least-once, dedupe**

**Đề bài:** event được giao lại hoặc hai consumer xử lý do rebalance. Notification business row chỉ tạo một lần.

<details><summary>Gợi ý</summary>
Unique `(ConsumerName,EventId)` và business mutation phải cùng transaction. Quy định khi handler lỗi permanent, retention inbox và replay event cũ sau khi inbox đã dọn.
</details>

### [TX-08] Email timeout với kết quả không xác định

**L4 · SMTP · ambiguous outcome, effectively-once**

**Đề bài:** SMTP đã nhận email nhưng client timeout. Retry có thể gửi hai thư; không retry có thể mất thư. Thiết kế policy theo loại email.

<details><summary>Gợi ý</summary>
Phân biệt welcome, marketing và security alert. Dùng stable message identity nếu provider hỗ trợ, delivery ledger, retry budget và trạng thái Unknown. Không tuyên bố exactly-once vượt boundary không kiểm soát.
</details>

### [TX-09] Cache invalidation sau transaction

**L3 · MySQL/Redis · cache-aside, version**

**Đề bài:** update community permission nhưng cache cũ vẫn cho user truy cập private content. Thiết kế correctness cho dữ liệu authorization.

<details><summary>Gợi ý</summary>
Không xóa cache trước commit. So sánh delete sau commit, outbox invalidation, versioned key và cache TTL cực ngắn. Khi security quan trọng, DB/version check có thể phải nằm trong critical path.
</details>

### [TX-10] Transfer ownership có nhiều invariant

**L3 · Aggregate transaction · lock ordering**

**Đề bài:** chuyển community ownership yêu cầu owner mới là active member, owner cũ thành admin, community luôn có đúng một owner. Hai transfer đồng thời không phá invariant.

<details><summary>Gợi ý</summary>
Mô hình owner là field hay membership role dẫn tới constraint khác nhau. Khóa/ cập nhật theo thứ tự cố định; audit và permission version cùng transaction; gửi notification qua outbox.
</details>

### [TX-11] Saga xóa tài khoản xuyên nhiều store

**L4 · Workflow · saga, compensation, tombstone**

**Đề bài:** xóa user liên quan MySQL, Cassandra, Elasticsearch, MinIO, Redis và email. Job phải resume, quan sát được và xử lý event đến muộn.

<details><summary>Gợi ý</summary>
MySQL giữ deletion request/state machine và tombstone identity. Mỗi bước idempotent, có checkpoint và reconciliation; phân biệt compensation khả thi với irreversible action. Chốt retention/legal hold và completion semantics.
</details>

### [TX-12] Distributed lease cho scheduled publish

**L4 · Scheduler · lease, fencing token**

**Đề bài:** nhiều worker cùng lấy scheduled post; worker bị GC pause quá lease rồi tiếp tục publish. Không được publish hai lần nguy hiểm.

<details><summary>Gợi ý</summary>
Lease expiry không đủ nếu worker cũ còn ghi. Dùng fencing/version tại resource, conditional state transition và idempotent publish key. Kiểm tra clock skew và recovery job.
</details>

### [TX-13] Snapshot export khi hệ thống vẫn ghi

**L4 · MySQL · snapshot isolation, high-water mark**

**Đề bài:** export toàn bộ dữ liệu community kéo dài một giờ nhưng user vẫn tạo/sửa/xóa nội dung. Định nghĩa export nhất quán nghĩa là gì.

<details><summary>Gợi ý</summary>
So sánh long snapshot transaction, high-water mark/event log và versioned reads. Đánh giá undo log, replica, delete tombstone và memory/disk; SLO có thể cho phép point-in-time thay vì latest.
</details>

### [TX-14] Reconciliation cho counter và projection

**L4 · Data repair · source of truth, drift**

**Đề bài:** comment count, member count và unread count có thể lệch do duplicate/mất event. Tạo framework phát hiện và sửa không làm production quá tải.

<details><summary>Gợi ý</summary>
Có chế độ audit/dry-run/apply, cursor/checkpoint, rate limit, expected version và metric drift. Update repair không được ghi đè thay đổi mới; partition workload và lưu bằng chứng trước/sau.
</details>

### [TX-15] Chọn isolation level theo use case

**L4 · MySQL InnoDB · isolation anomalies**

**Đề bài:** dựng test cho lost update, non-repeatable read, phantom và write skew trên membership, quota và moderation; chọn isolation/locking nhỏ nhất vẫn giữ invariant.

<details><summary>Tiêu chí hoàn thành</summary>
Phải có timeline hai transaction, SQL thực tế, kết quả theo từng isolation level, deadlock/lock-wait metric và lý do không tăng isolation toàn hệ thống.
</details>

### [TX-16] Multi-region write conflict

**L5 · Distributed consistency · conflict resolution**

**Đề bài:** profile và reaction được ghi từ hai region khi network partition. Chọn dữ liệu nào cần single-writer, dữ liệu nào có thể merge/LWW/CRDT.

<details><summary>Gợi ý</summary>
Không có một policy cho mọi aggregate. Nêu RPO/RTO, conflict visibility, clock uncertainty, home-region routing và failover runbook. Business invariant mạnh thường cần giảm availability hoặc đổi workflow.
</details>
