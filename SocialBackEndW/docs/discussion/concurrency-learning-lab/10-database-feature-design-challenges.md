# Đề bài thiết kế tính năng, database và luồng nghiệp vụ

Tài liệu này cố ý không đưa schema hoặc lời giải hoàn chỉnh. Mỗi đề yêu cầu bạn tự chọn mô hình dữ liệu, công nghệ và consistency phù hợp. Không được chọn công nghệ chỉ vì “phổ biến”; mọi lựa chọn phải gắn với requirement, workload và failure mode.

## 1. Sản phẩm đầu ra bắt buộc cho mỗi đề

1. Viết lại requirement, phạm vi không giải quyết và ít nhất năm câu hỏi cần hỏi Product.
2. Xác định actor, quyền, trạng thái nghiệp vụ, invariant và state transition.
3. Vẽ luồng đồng bộ và bất đồng bộ; đánh dấu transaction boundary, điểm publish event và side effect.
4. Thiết kế logical data model: entity, quan hệ, cardinality, key, constraint, index, lịch sử và retention.
5. Chọn database/source of truth; giải thích vì sao không chọn ít nhất hai phương án khác.
6. Thiết kế API/command/event, idempotency, ordering, optimistic concurrency và pagination.
7. Ước lượng RPS, storage growth, hot key/partition, query pattern và SLO.
8. Xử lý duplicate, out-of-order, retry, partial failure, crash, timeout và reconciliation.
9. Nêu cache strategy, invalidation, observability, security, rollout, migration và rollback.
10. Viết test plan gồm unit, integration, concurrent, load và failure injection.

## 2. Khung lựa chọn công nghệ

Các công nghệ dưới đây là ứng viên để so sánh, không phải đáp án mặc định:

- **PostgreSQL/SQL Server:** transaction, constraint, join, dữ liệu nghiệp vụ cần consistency mạnh.
- **Redis:** cache, rate limit, ephemeral state, sorted set, distributed coordination có giới hạn.
- **Kafka:** durable event log, decoupling, replay, partition ordering và stream processing.
- **Cassandra/ScyllaDB:** lượng ghi lớn, query theo partition key, dữ liệu time-series/chat.
- **Elasticsearch/OpenSearch:** full-text search, filtering, ranking và projection có eventual consistency.
- **MinIO/S3:** object lớn, lifecycle, presigned URL và versioning.
- **ClickHouse:** analytical query, event analytics và aggregation trên dữ liệu rất lớn.
- **Quartz.NET/Hangfire:** scheduled job; phải đánh giá persistence, retry, multi-instance và operational cost.
- **SignalR:** realtime delivery; không tự thay thế durable storage hoặc message broker.

Với mỗi lựa chọn hãy trả lời: nguồn dữ liệu chuẩn là gì, mất kết nối thì sao, dữ liệu stale được chấp nhận bao lâu, cách rebuild projection và chi phí vận hành.

## 3. Nhóm đề về tài khoản và bảo mật

### Đề 01 — Quản lý phiên đăng nhập trên nhiều thiết bị

User xem danh sách thiết bị, revoke một phiên hoặc toàn bộ phiên khác; refresh token rotation; phát hiện token reuse. Hai request refresh cùng lúc chỉ một request hợp lệ. Hãy thiết kế hash token, token family, expiry, audit và cache. Cân nhắc PostgreSQL, Redis hoặc kết hợp; giải thích luồng khi Redis mất dữ liệu và khi access token chưa hết hạn.

### Đề 02 — Xác thực hai bước và recovery code

Hỗ trợ TOTP, recovery codes dùng một lần và bắt buộc 2FA cho moderator. Secret phải được mã hóa; không log mã; bật/tắt 2FA cần re-authentication. Thiết kế state machine thiết lập/xác nhận/hủy, unique constraint, race khi hai recovery request dùng cùng code và audit security event.

### Đề 03 — Đăng nhập bất thường và khóa tạm thời

Chấm điểm rủi ro dựa trên IP, vị trí, thiết bị và số lần thất bại. Không khóa nhầm toàn bộ user sau một đợt tấn công phân tán. Thiết kế event ingestion, sliding window, rate limit, policy version và luồng challenge. So sánh Redis counter, Kafka stream và bảng SQL.

### Đề 04 — Xuất và xóa dữ liệu cá nhân

User yêu cầu export hoặc delete; dữ liệu nằm ở PostgreSQL, Cassandra, Elasticsearch, MinIO và backup. Job có thể kéo dài nhiều giờ, retry và resume. Thiết kế request state, snapshot, signed download, retention, tombstone, audit, legal hold và reconciliation cho event đến muộn.

## 4. Nhóm đề về community và moderation

### Đề 05 — Community riêng tư và lời mời

Owner tạo invite theo email, link hoặc user; invite có expiry, giới hạn lượt dùng và có thể revoke. Join đồng thời không vượt member limit; user bị ban không dùng invite. Thiết kế membership state machine, role, constraint, transaction và idempotent accept flow.

### Đề 06 — Yêu cầu tham gia có quy trình duyệt

Community cấu hình auto-approve hoặc cần moderator; nhiều moderator có thể xử lý cùng request. Quyết định đầu tiên hợp lệ phải thắng và ghi audit; user có thể hủy trước khi duyệt. Thiết kế optimistic concurrency, allowed transitions, notification event và permission cache invalidation.

### Đề 07 — Hệ thống report và hàng đợi moderation

Một nội dung có nhiều report reason; report trùng của cùng user cần dedupe; ưu tiên theo severity và số reporter đáng tin cậy. Moderator claim case, release khi timeout, escalate và appeal. Cân nhắc relational model, Kafka, Redis sorted set hoặc Elasticsearch; thiết kế source of truth và chống double handling.

### Đề 08 — Rule versioning và xác nhận lại nội quy

Community sửa nội quy theo version, lưu lịch sử và có thể yêu cầu thành viên xác nhận version mới trước khi đăng bài. Thiết kế effective time, draft/publish, acknowledgement, truy vấn “ai chưa xác nhận”, rollout cho hàng triệu member và xử lý rollback version.

## 5. Nhóm đề về nội dung và tương tác

### Đề 09 — Bản nháp, version và lịch đăng bài

User autosave draft trên nhiều thiết bị, xem version history và đặt lịch publish. Hai thiết bị sửa cùng lúc phải phát hiện conflict; scheduler nhiều instance không publish hai lần. Thiết kế revision model, concurrency token, timezone, durable scheduling, outbox và recovery khi publish thành công nhưng notification thất bại.

### Đề 10 — Chỉnh sửa bài viết và audit công khai

Cho phép sửa trong 30 phút; moderator có thể redact bất kỳ lúc nào; người đọc xem lịch sử thay đổi nhưng dữ liệu nhạy cảm đã redact không được lộ. Thiết kế immutable revision hay temporal table, permission, retention và cache key theo version.

### Đề 11 — Reaction mở rộng và bộ đếm

Ngoài upvote/downvote, community tự cấu hình reaction. Một user có tối đa một reaction mỗi nhóm; đổi reaction phải atomic. Bài nổi tiếng nhận 50.000 writes/s. Thiết kế source of truth, counter projection, sharded counter, Kafka partition key và reconciliation khi count lệch.

### Đề 12 — Bookmark theo collection và chia sẻ

User lưu post vào nhiều collection, sắp xếp thủ công, gắn note, chia sẻ collection read-only và revoke link. Post bị xóa phải biến mất hoặc hiện tombstone theo policy. Thiết kế thứ tự ổn định, pagination, unique constraint, visibility và truy vấn tránh N+1.

### Đề 13 — Hashtag trending theo khu vực và thời gian

Tính top hashtag trong cửa sổ 5 phút, 1 giờ, 24 giờ theo quốc gia; chống spam/bot; late event được cập nhật trong giới hạn. So sánh Kafka Streams/Flink, Redis sorted set và batch ClickHouse. Thiết kế event-time, watermark, correction và cách giải thích kết quả cho Product.

### Đề 14 — Search bài viết có quyền truy cập

Full-text search theo nội dung, tag, author, community và thời gian; kết quả không được lộ bài private hoặc của user bị block. PostgreSQL là source of truth, Elasticsearch là projection. Thiết kế index document, permission filtering, update/delete version, lag SLO và full reindex không downtime.

## 6. Nhóm đề về feed và recommendation

### Đề 15 — Home feed cá nhân hóa

Kết hợp bài từ người theo dõi, community, quảng bá và recommendation; không lặp item, hỗ trợ cursor, hide/report/block và diversity. Celebrity có hàng triệu follower. So sánh fan-out-on-write, fan-out-on-read và hybrid; thiết kế candidate store, ranking version, cache và propagation khi post bị xóa.

### Đề 16 — “Tiếp tục đọc” đa thiết bị

Lưu vị trí đọc theo post/video, đồng bộ gần realtime, cập nhật rất thường xuyên nhưng chỉ cần độ chính xác vài giây. Request cũ đến sau không được ghi đè progress mới. Thiết kế monotonic update, client sequence/timestamp, write coalescing, retention và offline sync.

### Đề 17 — Recommendation feedback

Thu thập impression, click, dwell time, hide và report để huấn luyện/ranking. Event volume 100.000/s; cần A/B experiment và privacy retention. Thiết kế event schema/version, dedupe, Kafka partition, analytical store, online feature store và đường xóa dữ liệu user.

## 7. Nhóm đề về chat và realtime

### Đề 18 — Read receipt và unread count

Conversation có hàng nghìn người; lưu “đã đọc đến message nào” thay vì một row mỗi message-user nếu phù hợp. Message có thể đến lệch thứ tự; user dùng nhiều thiết bị. Thiết kế sequence, monotonic cursor, unread count projection, SignalR event và reconciliation.

### Đề 19 — Attachment trong chat

Client upload trước rồi gửi message tham chiếu object; object chưa gắn message sẽ được dọn sau 24 giờ. Chỉ participant được tải; URL hết hạn; scan malware bất đồng bộ. Thiết kế attachment state machine, ownership, finalize transaction, MinIO lifecycle và race giữa cleanup/finalize.

### Đề 20 — Message edit/delete và đồng bộ offline

Client offline nhiều ngày rồi reconnect, cần nhận delta; edit/delete có version và audit theo retention policy. Thiết kế sync cursor, tombstone, compaction, conflict rule, Cassandra partition và Elasticsearch projection out-of-order.

### Đề 21 — Presence và trạng thái đang nhập

Presence/typing là ephemeral, chấp nhận mất dữ liệu nhưng phải tự hết hạn. Một user có nhiều connection trên nhiều node. Thiết kế session lease, heartbeat, Redis hay in-memory + backplane, aggregation và giới hạn fan-out cho room lớn.

## 8. Nhóm đề về notification và workflow

### Đề 22 — Tùy chọn notification đa kênh

User cấu hình theo loại event và kênh in-app/email/push, quiet hours theo timezone và digest. Security alert không được tắt. Thiết kế policy inheritance, effective setting query, schedule, template version, dedupe và thay đổi preference khi event đang chờ.

### Đề 23 — Notification digest

Gom sự kiện theo user thành email mỗi ngày/tuần, không gửi item đã bị xóa hoặc user đã xem; một user chỉ nhận một digest cho một kỳ. Thiết kế aggregation window, cutoff, idempotency key, scheduler nhiều instance, late event và tracking trạng thái gửi.

### Đề 24 — Workflow duyệt nội dung cấu hình được

Mỗi community định nghĩa các bước review khác nhau theo loại post; có timeout, escalation và rollback. Workflow definition thay đổi không được phá instance đang chạy. Thiết kế versioned definition, workflow instance, transition log, task assignment và event-driven orchestration.

## 9. Nhóm đề về vận hành và dữ liệu

### Đề 25 — Audit log chống sửa đổi

Ghi ai làm gì, trước/sau, correlation id; tìm kiếm theo actor/resource/time; dữ liệu nhạy cảm phải mask. Thiết kế append-only model, hash chain hoặc WORM storage, partition/retention, access control và cách chứng minh log không bị sửa.

### Đề 26 — Feature flag và staged rollout

Flag theo phần trăm, user, role, region; kết quả phải ổn định cho cùng user; hỗ trợ kill switch và audit. Thiết kế rule priority/version, cache/invalidation, fallback khi config service lỗi và tránh gọi database cho từng request.

### Đề 27 — Hệ thống quota theo gói dịch vụ

Giới hạn upload bytes, số community và API calls; quota reset theo kỳ, có reservation cho upload đang chạy. Hai request đồng thời không vượt quota; job reconciliation sửa reservation bị treo. So sánh SQL conditional update, Redis Lua và event ledger.

### Đề 28 — Analytics gần realtime

Dashboard hiển thị active users, post/reaction/message theo phút và p95 processing delay; query không làm ảnh hưởng OLTP. Thiết kế event contract, Kafka, ClickHouse/materialized view, late event, backfill, retention và định nghĩa metric tránh đếm khác nhau giữa team.

### Đề 29 — Webhook cho đối tác

Đối tác đăng ký endpoint và event; delivery có chữ ký, retry, disable khi lỗi liên tục và replay có kiểm soát. Thiết kế subscription, secret rotation, delivery attempt, payload version, ordering scope, rate limit, SSRF protection và idempotency cho receiver.

### Đề 30 — Import quan hệ thành viên từ file

Admin upload CSV hàng triệu dòng để invite/update role; cần dry-run, báo lỗi theo dòng, approve rồi mới apply, resume sau crash và rollback hợp lý. Thiết kế staging tables, job state/checkpoint, validation snapshot, batch transaction và thay đổi dữ liệu giữa dry-run/apply.

## 10. Các vòng nâng độ khó

Sau khi hoàn thành một đề, tự thay đổi constraint theo từng vòng:

- **Vòng 1:** một instance, 100 RPS, một database, cho phép downtime ngắn.
- **Vòng 2:** nhiều instance, 5.000 RPS, không downtime, dependency có timeout.
- **Vòng 3:** 100.000 RPS, multi-region, yêu cầu data residency và disaster recovery.
- **Vòng 4:** cắt 50% chi phí hạ tầng mà giữ SLO.
- **Vòng 5:** migration từ thiết kế cũ sang mới khi hệ thống vẫn đang ghi dữ liệu.

Mỗi vòng phải chỉ ra phần nào của thiết kế cũ vẫn đúng, phần nào trở thành bottleneck và tín hiệu đo lường nào cho biết đã đến lúc đổi kiến trúc.

## 11. Câu hỏi dùng để tự phản biện thiết kế database

- Constraint nào chỉ nằm trong code nhưng đáng ra phải được database bảo vệ?
- Query pattern quan trọng nhất là gì và index phục vụ đúng thứ tự cột chưa?
- Có entity nào tăng vô hạn, partition nào trở thành hot spot hoặc row nào bị update quá nhiều không?
- Dữ liệu lịch sử cần immutable, temporal, event log hay chỉ cần current state?
- Transaction boundary có bao trùm network call hoặc quá nhiều row không?
- Khi event duplicate/out-of-order, version nào thắng và quyết định đó nằm ở đâu?
- Projection/cache/index có thể rebuild từ source of truth không? Mất bao lâu?
- Xóa user có đi xuyên mọi store, backup, DLQ và event đến muộn không?
- Migration có tương thích với cả application version cũ và mới trong rolling deploy không?
- Có thể vận hành, quan sát, backup, restore và reconciliation thiết kế này lúc 3 giờ sáng không?
