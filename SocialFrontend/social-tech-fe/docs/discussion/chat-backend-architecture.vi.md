# Kiến Trúc Backend Chat, Thực Hành Tốt Nhất & Bảo Mật

Tài liệu này tập trung phân tích sâu về thiết kế backend của hệ thống Chat Real-time, các Best Practices lập trình, hướng phát triển mở rộng hạ tầng và các nguyên tắc bảo mật thông tin.

---

## 1. Phân Tích Các Tầng Dữ Liệu Backend

Hệ thống Chat Backend được tổ chức theo kiến trúc sạch (Clean Architecture) phân tách rõ ràng giữa các cổng giao tiếp (Ports), bộ điều hợp (Adapters), nghiệp vụ (Application) và hạ tầng lưu trữ (Infrastructure).

### Sơ Đồ Khối Liên Kết Các Tầng Backend
```
                       +-----------------------------------+
                       |    SignalR ChatHub / Controller   |  <--- (Presentation)
                       +-----------------------------------+
                                         |
                                         v
                       +-----------------------------------+
                       |       IChatPort / ChatAdapter     |  <--- (Application Logic)
                       +-----------------------------------+
                                   /           \
                                  v             v
       +----------------------------+         +-------------------------------+
       | Relational Repositories    |         | IChatMessageStore             |
       | (MySQL / EF Core)          |         | (Cassandra / Driver)          | <--- (Persistence)
       | - ChatConversations        |         | - chat_messages_by_    |
       | - ChatConversationPart...  |         |   conversation                |
       +----------------------------+         +-------------------------------+
```

### Chi Tiết Nhiệm Vụ Từng Tầng:
1. **Presentation Layer (`ChatHub.cs`, `ChatController.cs`)**:
   * Cung cấp các giao diện kết nối real-time (SignalR Websocket) và REST API.
   * Chịu trách nhiệm xác thực người dùng dựa trên JWT claims (`NameIdentifier`), phân phối kết nối vào các nhóm thông báo cá nhân (`user:{userId}`) hoặc nhóm hội thoại (`conversation:{key}`).
2. **Application Layer (`IChatPort.cs`, `ChatAdapter.cs`)**:
   * Chứa đựng toàn bộ logic nghiệp vụ chat: kiểm tra điều kiện follow chéo trước khi nhắn tin trực tiếp, kiểm tra membership nhóm trước khi nhắn tin nhóm.
   * Điều phối việc lưu trữ hội thoại (MySQL) và ghi nhận tin nhắn (Cassandra).
   * Phát đi các sự kiện SignalR tới các client liên quan sau khi ghi nhận dữ liệu thành công.
3. **Persistence Layer (EF Core MySQL & Cassandra Driver)**:
   * **MySQL**: Đóng vai trò quản lý siêu dữ liệu (Metadata) như: Trạng thái phòng chat, danh sách thành viên trong phòng chat, tiêu đề phòng chat, tin nhắn xem trước cuối cùng (`LastMessagePreview`), và thời gian hoạt động cuối cùng (`LastMessageAtUtc`).
   * **Cassandra**: Đóng vai trò là Message Store chính hiệu năng cao, lưu trữ chuỗi tin nhắn phi cấu trúc sắp xếp theo dòng thời gian nhờ Clustering Key.

---

## 2. Các Thực Hành Tốt Nhất (Best Practices)

### A. Quản Lý Kết Nối & Tránh Tranh Chấp Cơ Sở Dữ Liệu
* **Cassandra Session Reuse**: Driver Cassandra khuyến cáo chỉ khởi tạo một thực thể `ICluster` và một thực thể `ISession` duy nhất trong suốt vòng đời của ứng dụng. `CassandraSessionProvider` được đăng ký dưới dạng **Singleton** và sử dụng `SemaphoreSlim` để tạo cơ chế Lock phi chặn (non-blocking lock), ngăn chặn việc khởi tạo nhiều Session kết nối đồng thời từ các Thread khác nhau.
* **EF Core No-Tracking**: Đối với các truy vấn kiểm tra quyền hạn (như `IsFollowingAsync`, `CanAccessAsync`), luôn sử dụng `.AsNoTracking()` để giảm thiểu gánh nặng quản lý thực thể (Change Tracker) của EF Core, tối ưu hóa tốc độ CPU và bộ nhớ.

### B. Cơ Chế Idempotency (Tránh Gửi Tin Trùng Lặp)
* **ClientMessageId**: Mỗi tin nhắn từ frontend gửi lên luôn mang kèm một mã `clientMessageId` (GUID được tạo ngẫu nhiên ở client).
* **Kiểm soát trùng lặp**: Khi có sự cố mạng khiến gói tin phản hồi HTTP/SignalR từ server bị thất lạc, frontend sẽ thử gửi lại tin nhắn đó với cùng một `clientMessageId`. Ở Cassandra, khóa chính của bảng là `PRIMARY KEY ((conversation_key), sent_at_utc, message_id)`. Tuy nhiên, ta có thể bổ sung một bảng chỉ mục phụ hoặc kiểm tra cache Redis theo `clientMessageId` để phát hiện và bỏ qua các yêu cầu bị trùng lặp.

### C. Quản Lý Hủy Tác Vụ (Cancellation Management)
* **Hub Connection Aborted**: Trong môi trường real-time, kết nối mạng có thể bị đứt bất ngờ. Việc sử dụng `Context.ConnectionAborted` làm CancellationToken truyền xuống tầng EF Core và Cassandra Driver giúp giải phóng các luồng làm việc trên Server ngay lập tức, tiết kiệm tài nguyên hệ thống.

---

## 3. Bảo Mật Hệ Thống Chat (Chat Security Guidelines)

### A. Xác Thực & Phân Quyền Kết Nối (Auth & Authorization)
* **JWT Query String Validation**: Vì giao thức WebSocket mặc định không hỗ trợ truyền custom headers trên trình duyệt, token JWT bắt buộc phải được truyền qua Query tham số `?access_token=...`. Cần bảo mật đường truyền bằng **HTTPS/WSS** để tránh lộ Token trên các proxy trung gian.
* **Conversation Access Check**: Trước khi người dùng nạp tin nhắn của phòng chat qua `GetMessages` hoặc đăng ký lắng nghe sự kiện qua `JoinConversation`, backend bắt buộc phải chạy hàm `EnsureConversationAccessAsync`:
  ```csharp
  var canAccess = await _chatConversationRepository.CanAccessAsync(conversationKey, userId, cancellationToken);
  if (!canAccess) throw new ValidationException("User không có quyền truy cập hội thoại này.");
  ```
  Điều này ngăn ngừa tấn công rò rỉ dữ liệu chéo (ID-based Access Bypass).

### B. Kiểm Soát Tần Suất Gửi Tin (Rate Limiting & Anti-Spam)
* **Thách thức**: Kẻ tấn công có thể spam hàng ngàn tin nhắn qua kết nối Websocket đang mở để làm tràn ngập dữ liệu Cassandra.
* **Giải pháp**: Tích hợp một Middleware Rate Limiting dành riêng cho SignalR Hub (ví dụ dùng `Microsoft.AspNetCore.RateLimiting` hoặc bộ đệm Redis Token Bucket) giới hạn mỗi người dùng chỉ được gửi tối đa 5 tin nhắn/giây. Nếu vượt quá, lập tức tạm ngắt kết nối.

### C. Phòng Chống XSS và Nội Dung Độc Hại
* **Sanitize Content**: Nội dung chat (`Content`) cần được chuẩn hóa và loại bỏ các thẻ HTML nguy hiểm trước khi lưu vào Cassandra và phát real-time tới người dùng khác. Sử dụng các thư viện như `Ganss.XSS.HtmlSanitizer` để loại bỏ hoàn toàn các thẻ `<script>`, `onload`, `onerror` bảo vệ phía client không bị tấn công XSS khi hiển thị tin nhắn.

---

## 4. Hướng Phát Triển Hệ Thống Tương Lai (Roadmap)

### A. Tách Biệt Service Chat (Microservices Architecture)
Khi lượng truy cập tăng cao, việc chat realtime chiếm dụng nhiều kết nối TCP mở liên tục (Long-lived connections).
* **Định hướng**: Tách SignalR ChatHub và logic lưu trữ Cassandra ra thành một Service riêng độc lập với hệ thống Web chính. Sử dụng **Redis Backplane** để đồng bộ hóa các sự kiện chat giữa nhiều Node SignalR chạy song song phía sau Load Balancer.

### B. Tích Hợp Thông Báo Đẩy Offline (Offline Push Notifications)
* **Giải pháp**: Khi tin nhắn được gửi đi, nếu người nhận đang Offline (không có connection hoạt động trong `ChatHub`), backend sẽ gửi một Integration Event qua **Kafka** (ví dụ topic `socialtech.chat-notifications`). 
* Một dịch vụ Notification Worker độc lập sẽ tiêu thụ sự kiện này và gửi tin nhắn đẩy (Push Notification) qua dịch vụ Firebase Cloud Messaging (FCM) hoặc Apple Push Notification service (APNs) tới điện thoại hoặc trình duyệt của người nhận.

### C. Quản Lý Kích Thước Phân Vùng Trong Cassandra (Partition Size Tuning)
* Bảng `chat_messages_by_conversation` sử dụng `conversation_key` làm Partition Key. Với các cuộc hội thoại hoạt động liên tục trong nhiều năm, kích thước phân vùng (Partition size) có thể vượt quá giới hạn khuyến cáo của Cassandra (thường là dưới 100MB hoặc 100,000 dòng).
* **Giải pháp**: Thiết kế lại Partition Key dạng hỗn hợp (Bucket Partition Key) bằng cách kết hợp Conversation Key và tháng/năm gửi tin. Ví dụ: `PRIMARY KEY ((conversation_key, time_bucket), sent_at_utc, message_id)`. Trong đó `time_bucket` có dạng `2026-06`. Khi đó, tin nhắn của mỗi tháng sẽ nằm ở một phân vùng vật lý khác nhau, bảo đảm hệ thống có thể mở rộng vô hạn.
