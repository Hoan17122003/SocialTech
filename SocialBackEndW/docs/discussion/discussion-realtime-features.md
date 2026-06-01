# Discussion: Realtime Features, WebSocket, Security, and Design Patterns

## Mục tiêu của tài liệu

Tài liệu này tổng hợp lại toàn bộ phần trao đổi về:
- Cơ chế từ client qua server trong `WebSocket`/`SignalR` hoạt động như thế nào.
- Vì sao phần `security` phải customize thêm khi dùng realtime hub như `NotificationHub`.
- Cách tư duy thiết kế hệ thống realtime trong thực tế.
- Các `best practices` về `authentication`, `authorization`, `persistence`, `observability`, `scale-out`, và những `pattern` thường gặp.
- Những lỗi đã gặp gần đây trong quá trình triển khai notification realtime, nguyên nhân, cách fix, các phương án thay thế, và hướng phát triển tiếp theo.

Mục tiêu là giải thích để có thể hiểu từ gốc, sau đó liên hệ trực tiếp với code hiện tại trong dự án.

---

## 1. Từ request-response sang kết nối sống

### HTTP thông thường

Mô hình HTTP có vòng đời ngắn:
1. Client gửi request.
2. Server xử lý.
3. Server trả response.
4. Kết nối logic kết thúc.

Nếu cần cập nhật liên tục, client thường phải `polling`:
- Cứ vài giây gọi API một lần.
- Nếu không có dữ liệu mới thì vẫn tốn request.
- Tăng độ trễ, tăng băng thông, và trải nghiệm không thật sự realtime.

### WebSocket / SignalR

Với realtime, thay vì mở từng request riêng lẻ, client mở một kết nối sống đến server.
Sau khi kết nối được thiết lập:
- Client có thể gửi dữ liệu cho server bất cứ lúc nào.
- Server cũng có thể chủ động đẩy dữ liệu cho client bất cứ lúc nào.
- Hai bên giữ một connection lâu dài.

`SignalR` trong ASP.NET Core là một abstraction bao quanh realtime transport:
- Ưu tiên `WebSocket`.
- Có thể fallback sang transport khác nếu cần.
- Cung cấp `Hub`, `Clients`, `Groups`, `Context`, và mô hình gọi method rất thuận tiện.

---

## 2. Cơ chế kết nối realtime từ client qua server

Đây là luồng cơ bản với `NotificationHub`:

1. User login qua API và nhận `JWT`.
2. Frontend mở kết nối đến `/notificationHub`.
3. `JWT` được gửi kèm theo kết nối, thường qua `access_token`.
4. Middleware `authentication` của ASP.NET Core validate token.
5. Nếu hợp lệ, hub nhận được identity của user qua `ClaimsPrincipal`.
6. Hub add connection vào group của user, ví dụ `user:123`.
7. Khi có notification mới, server đẩy message vào group `user:123`.
8. Nếu user offline, notification vẫn nên được lưu `DB` để lần sau load lại.

### Minh hoạ flow runtime

```text
+-------------------+        JWT + connect        +----------------------+
| Web / Mobile App  | --------------------------> | ASP.NET Core Pipeline |
| SignalR client    |                             | Authentication        |
+-------------------+                             +----------+-----------+
                                                              |
                                                              v
                                                   +----------------------+
                                                   | NotificationHub      |
                                                   | Context.User         |
                                                   | Groups.AddToGroup    |
                                                   +----------+-----------+
                                                              |
                                         get/send/mark read   |
                                                              v
                                                   +----------------------+
                                                   | Application Service  |
                                                   | InAppNotification... |
                                                   +----------+-----------+
                                                              |
                                                    save/load  |
                                                              v
                                                   +----------------------+
                                                   | Database             |
                                                   | Notifications table  |
                                                   +----------------------+
```

---

## 3. Vì sao `security` phải tham gia vào hub realtime

Trong API thông thường, `security` được áp dụng theo từng request.
Trong realtime, `security` không chỉ kiểm tra một request đơn lẻ, mà đang kiểm soát cả một kết nối sống có thể tồn tại rất lâu.

Cần trả lời các câu hỏi sau:
- Ai đang kết nối?
- Kết nối này thuộc user nào?
- User này có quyền nghe event này không?
- User này có được join group này không?
- Token này đã hết hạn hay bị `blacklist` chưa?
- Nếu user logout thì connection đang sống có nên bị vô hiệu hoá không?

Nếu không xử lý `security` đúng cách:
- Hub có thể bị kết nối bởi anonymous client.
- User có thể join nhầm hoặc join trái phép group của người khác.
- Server có thể push notification sai đối tượng.
- Token đã logout vẫn có thể tiếp tục dùng connection cũ.

---

## 4. Vì sao phải customize `SecurityConfiguration` cho SignalR

### API REST thông thường
`JWT` nằm trong header:

```http
Authorization: Bearer <token>
```

### SignalR / WebSocket thông thường
Nhiều client SignalR gửi token qua query string:

```text
/notificationHub?access_token=<token>
```

Mặc định, middleware `JWT Bearer` sẽ tìm token trong header `Authorization`.
Nếu không customize thêm:
- Hub có `[Authorize]` nhưng middleware không đọc được token.
- `Context.User` rỗng.
- `Context.UserIdentifier` rỗng.
- Không thể map user vào group riêng.
- Các method của hub không biết ai đang gọi.

### Vị trí customization đã thêm

Trong `SecurityConfigurationExtensions`, phần `OnMessageReceived` được dùng để:
- Kiểm tra request có đi vào `/notificationHub` không.
- Nếu có `access_token` thì nạp nó vào `context.Token`.

Sau bước đó middleware mới validate được kết nối của hub như một request đã được authenticate.

### Blacklist / revocation trong hub

Không chỉ đọc token cho handshake, mà phần validate `blacklist` cũng phải đọc đúng token của hub.
Nếu không:
- API REST có thể bị chặn đúng.
- Nhưng connection SignalR lại có thể bỏ qua `blacklist` vì token đến từ query string.

Do đó customization `security` không phải là “logic phụ”, mà là để đảm bảo cùng một mô hình `security` được áp dụng nhất quán giữa API và realtime transport.

---

## 5. Cơ chế handshake và vòng đời `security` trong realtime

### Handshake
`Handshake` là lúc client xin thiết lập kết nối realtime.
Ở giai đoạn này:
- Client gửi request mở kết nối.
- `JWT middleware` validate token.
- Nếu hợp lệ, request được nâng cấp thành kết nối realtime.
- Hub có `Context.User` và có thể sử dụng claims.

### Sau handshake
Sau khi kết nối đã được mở:
- Connection có một identity đã được xác lập.
- Hub có thể đưa connection vào group theo user, post, conversation, community, tenant.

### Điểm cần lưu ý
`Authentication` không nên chỉ được xem là việc “vào được hub”.
Cần nghĩ thêm:
- Token refresh trong lúc connection đang sống.
- Connection đang sống khi token vừa hết hạn.
- Revocation khi logout.
- Reconnect có lấy token mới hay không.

### Best practice
- Mỗi lần reconnect, client nên dùng access token mới nhất.
- Nếu token hết hạn, frontend nên reconnect với token mới sau khi refresh.
- Nếu logout, nên đóng connection client và revoke token nếu có `blacklist`.

---

## 6. Sự khác nhau giữa Authentication và Authorization trong realtime

### Authentication
Trả lời câu hỏi:
- Bạn là ai?

Ví dụ:
- `JWT` hợp lệ.
- `ClaimTypes.NameIdentifier = 123`.

### Authorization
Trả lời câu hỏi:
- Bạn được làm gì?
- Bạn được nghe sự kiện nào?
- Bạn được join group nào?

Ví dụ trong realtime:
- Chỉ chủ bài viết hoặc người được cấp quyền mới được join group `post:{id}`.
- Chỉ participant mới được join `conversation:{id}`.
- Chỉ admin mới được nghe moderation events.

### Sai lầm phổ biến
Sai lầm phổ biến là authenticate xong rồi cho join mọi group theo id client gửi lên.
Đây là một lỗ hổng `security` lớn.

Best practice:
- Mọi method `JoinXxxGroup` đều cần `authorization check`.
- Không bao giờ tin group name do client gửi là hợp lệ về nghiệp vụ.

---

## 7. Realtime không phải là source of truth

Đây là một tư duy rất quan trọng.

Nhiều người mới học realtime hay nghĩ:
- Có SignalR rồi thì chỉ cần `SendAsync` là đủ.

Thực tế:
- User có thể offline.
- User có thể mất mạng.
- Event có thể đến khi tab đã đóng.
- Client có thể reconnect sau một khoảng thời gian.

Vì vậy cần tách 2 lớp:
- `Persistent state`: lưu dữ liệu chính trong `DB`.
- `Realtime delivery`: nếu user online thì push ngay.

### Notification là ví dụ điển hình

Cách tốt:
1. Tạo notification trong `DB`.
2. Push notification qua hub nếu user đang online.
3. Khi user vào lại, load lịch sử từ `DB`.
4. `Mark as read` được lưu xuống `DB`.

Cách không bền vững:
1. Chỉ `SendAsync`.
2. User offline thì mất dữ liệu.
3. Không có unread state.
4. Không có audit trail.

### Kết luận tư duy
Realtime là `delivery mechanism`.
Database / event store mới là `source of truth`.

---

## 8. Minh hoạ kiến trúc tối ưu cho hệ thống realtime thực tế

Sơ đồ dưới đây không chỉ dành cho notification, mà còn áp dụng cho chat, presence, moderation events, collaboration, dashboard updates.

```text
                               +----------------------+
                               |   Identity Provider  |
                               |  JWT / OAuth / SSO   |
                               +----------+-----------+
                                          |
                                          v
+-------------------+          +----------------------+          +----------------------+
| Web / Mobile App  | <------> | ASP.NET Core Gateway | <------> | REST Controllers     |
| UI + SignalR      |  HTTP    | + Auth Middleware    |          | CRUD / Query APIs    |
| Reconnect logic   |  WS      | + SignalR Hub        |          +----------------------+
+---------+---------+          +----------+-----------+
          |                                |
          | realtime push                  |
          |                                v
          |                     +----------------------+
          |                     | Application Layer    |
          |                     | Use cases / Services |
          |                     +----+------------+----+
          |                          |            |
          |                 save state|            |publish event
          |                          v            v
          |                 +----------------+  +-------------------+
          |                 | Database       |  | Message Broker    |
          |                 | SQL / NoSQL    |  | Kafka / RabbitMQ  |
          |                 +--------+-------+  +---------+---------+
          |                          |                    |
          |                          |                    v
          |                          |          +----------------------+
          |                          |          | Background Workers   |
          |                          |          | Notification fanout  |
          |                          |          +----------+-----------+
          |                          |                     |
          |                          +---------------------+
          |                                                |
          v                                                v
+----------------------+                        +----------------------+
| Cache / Redis        | <--------------------> | SignalR Backplane    |
| Presence / Counters  |                        | Scale-out fanout     |
+----------------------+                        +----------------------+
```

### Vai trò của từng thành phần

- `Gateway + Auth Middleware`
  Xử lý auth, route request, handshake, rất phù hợp để tách governance chung.

- `SignalR Hub`
  Mở, đóng, nhận command nhỏ, route vào service, quản lý group và connection.

- `Application Layer`
  Chứa `business logic` thật sự.

- `Database`
  Lưu state bền vững: notification, message, unread count, audit, timeline.

- `Message Broker`
  Dùng khi event được tạo ở nhiều nơi và cần `fan-out` bất đồng bộ.

- `Redis / Backplane`
  Dùng khi scale nhiều instance server, giúp message đến đúng connection đang nằm ở server nào.

---

## 9. Pattern thiết kế phổ biến trong realtime

### Pattern 1: Hub-as-thin-controller

Hub chỉ đóng vai trò như một adapter mỏng:
- Validate caller có auth chưa.
- Lấy user id từ claims.
- Gọi sang application service.
- Quản lý group.
- Trả event cho client.

Không nên để `business logic` dày đặc trong hub.

### Pattern 2: Persist-then-push

1. Ghi state vào `DB`.
2. Sau đó push realtime.

Dùng cho:
- notification
- chat message
- order status
- comment stream

### Pattern 3: Event-driven fanout

Khi hệ thống lớn hơn, không nên để request web vừa cập nhật `DB` vừa tự `fan-out` qua mọi kênh.
Thay vào đó:
1. Domain/application tạo event.
2. Event vào broker.
3. Worker / consumer xử lý fanout.
4. Fanout đến websocket, email, push notification, analytics.

### Pattern 4: Group-based routing

Thay vì gửi trực tiếp theo từng `ConnectionId`, route theo group:
- `user:{id}`
- `conversation:{id}`
- `post:{id}`
- `community:{id}`
- `tenant:{id}`

### Pattern 5: CQRS-lite for realtime

- `Command`: hub nhận `MarkNotificationAsRead`, `SendMessage`, `JoinConversation`.
- `Query`: REST API hoặc hub method đọc lịch sử, unread count, snapshot.

### Pattern 6: Snapshot + delta sync

Client mới vào thường cần:
1. Lấy snapshot hiện tại từ API hoặc hub method.
2. Sau đó nghe delta qua realtime.

Ví dụ:
- Mở danh sách notification: load 20 notification gần nhất.
- Sau đó nghe `notificationReceived` và `notificationsRead`.

---

## 10. Best practices về security cho realtime

### 10.1. Không tin client

Client có thể gửi:
- group name sai
- object id không được phép truy cập
- command bị sửa

Nguyên tắc:
- Mọi `JoinGroup` đều phải `authorization check`.
- Mọi command đều verify actor trước khi mutate state.

### 10.2. Tách rõ principal và resource authorization

Không chỉ check user hợp lệ, mà còn phải check quan hệ giữa user và resource.

Ví dụ:
- User hợp lệ nhưng không phải participant của conversation.
- User hợp lệ nhưng post là private.
- User hợp lệ nhưng không thuộc tenant đó.

### 10.3. Dùng claim và permission một cách rõ ràng

Có thể dựa vào:
- `NameIdentifier`
- `role`
- `permission`
- `tenant`
- `community`

Nhưng không nên nhét quá nhiều logic và token quá lớn nếu claim thay đổi liên tục.

### 10.4. Handle token expiration và reconnect

Client nên:
- Lấy access token mới nhất mỗi lần connect/reconnect.
- Nếu refresh token thành công thì rebuild connection.

### 10.5. Revocation và blacklist

Nếu dự án đang có `blacklist token` trong cache/Redis, hub cũng phải check cùng logic đó.
Nếu không sẽ có tình trạng:
- API bị logout đúng.
- Hub vẫn sống và tiếp tục nhận event.

### 10.6. Presence là dữ liệu tạm thời, không phải quyền

Online/offline presence không nên được dùng như authority về quyền.
Presence nên lưu trong cache nhanh như Redis.
Permission và authorization vẫn nên xác nhận từ logic nghiệp vụ.

### 10.7. Multi-tenant isolation

Nếu hệ thống có tenant, group name và permission nên được namespace rõ ràng.
Ví dụ:
- `tenant:7:user:123`
- `tenant:7:conversation:456`

### 10.8. Rate limit và abuse protection

Hub methods cũng có thể bị spam.
Cần nghĩ đến:
- rate limit theo user / connection / IP
- payload size limit
- validate input kỹ
- throttle join/leave/group spam

### 10.9. Logging bảo mật

Không log raw token.
Không đẩy thông tin nhạy cảm xuống client.
Nên log:
- user id
- connection id
- action
- auth failure reason ở mức tổng quát
- resource id nếu cần

---

## 11. Các pattern security customization nâng cao

### 11.1. Custom token extraction pattern

Vấn đề:
- REST dùng header.
- SignalR dùng query string.
- Một số công cụ khác dùng cookie.

Pattern:
- Viết một điểm tập trung trong auth middleware để quyết định token đến từ đâu theo từng endpoint/transport.

### 11.2. Custom `IUserIdProvider`

SignalR hỗ trợ custom `IUserIdProvider` để quyết định user id trong hub là claim nào.
Dùng khi:
- Muốn map theo `sub`
- Muốn map theo `publicId`
- Muốn kết hợp tenant + user

### 11.3. Policy-based authorization for hub methods

Ngoài `[Authorize]` trên hub, có thể dùng policy cho từng method hoặc logic service.

Ví dụ:
- `[Authorize(Policy = \"CanModerateCommunity\")]`

### 11.4. Resource-authorization service pattern

Tạo service chuyên check quyền truy cập resource:
- `ICanAccessConversationService`
- `IPostAccessAuthorizer`
- `INotificationAccessPolicy`

### 11.5. Security context propagation pattern

Trong hệ thống `event-driven`, event được đẩy sang worker/background process.
Có thể cần mang theo:
- actor id
- trace id
- tenant id
- correlation id

### 11.6. Defense in depth

Không nên chỉ tin vào một tầng.
Nên có nhiều lớp:
- Validate `JWT`
- Check `blacklist`/revocation
- Check permission/policy
- Check resource ownership/membership
- Validate payload
- Audit logging
- Rate limiting

---

## 12. Best practices khác cho hệ thống realtime trong thực tế

### 12.1. Không phụ thuộc vào `ConnectionId`

`ConnectionId` có tính tạm thời.
User có thể:
- refresh tab
- mở nhiều tab
- đổi mạng
- reconnect

Nên route theo `user/group/resource` thay vì identity nghiệp vụ dựa trên `ConnectionId`.

### 12.2. Chấp nhận duplicate delivery

Trong hệ thống realtime, duplicate là chuyện có thể xảy ra.
Cần design để `idempotent`:
- Message có `Id`
- Client `dedupe` theo `Id`
- Server không giả định `exactly-once delivery`

### 12.3. Tách payload nhỏ và payload lớn

Realtime nên đẩy event nhỏ, đủ để UI update.
Nếu cần detail lớn:
- Gửi event nhỏ
- Client gọi query/API lấy thêm

### 12.4. Snapshot trước, stream sau

Client mới vào nên:
1. Load snapshot.
2. Đăng ký realtime.
3. Áp dụng delta tiếp theo.

### 12.5. Observability và tracing

Realtime rất khó debug nếu thiếu telemetry.
Nên có:
- structured logs
- correlation id
- metrics số connection đang mở
- metrics message sent/failed
- reconnect count
- auth failure count
- average latency event-to-delivery

### 12.6. Scale-out strategy

Một instance server hoạt động dễ.
Nhiều instance thì cần:
- `Redis backplane` cho SignalR
- hoặc event bus + realtime dispatcher
- hoặc managed realtime service

---

## 13. Áp vào bài toán `NotificationHub` trong dự án hiện tại

Hướng thiết kế hợp lý của `NotificationHub` nên được hiểu như sau:

### Flow chi tiết

1. User login qua API và nhận `JWT`.
2. Frontend mở SignalR connection đến `/notificationHub?access_token=...`.
3. `SecurityConfigurationExtensions` đọc token từ query string.
4. `JWT middleware` validate token.
5. `NotificationHub` lấy user id từ claims.
6. Hub add connection vào group `user:{userId}`.
7. Khi có notification mới:
   - service tạo bản ghi trong `DB`
   - service push `notificationReceived` vào group của user
8. Khi client muốn lấy lịch sử:
   - hub trả về `GetMyNotifications()`
9. Khi client đọc notification:
   - hub gọi `MarkNotificationAsRead(...)`
   - `DB` cập nhật `IsRead`, `ReadAtUtc`
   - server push `notificationsRead`

### Điểm mạnh của luồng này

- Có authentication.
- Có identity rõ ràng theo user.
- Có persistence.
- Có realtime push.
- Có read state.
- Có khả năng hoạt động cả khi user offline.

### Điểm nên cải tiến tiếp

- Thêm unread count từ backend.
- Thêm paging cho lịch sử notification.
- Nếu `JoinPostGroup` là cho bài viết private, cần authorization check.
- Có thể bổ sung REST API snapshot cho notification center.
- Có thể thay `.Result` trong blacklist check bằng async thuần hơn nếu muốn tối ưu.

---

## 14. Sơ đồ chuỗi sự kiện end-to-end cho Notification realtime

```text
User Login
   |
   v
REST API issue JWT
   |
   v
Frontend opens SignalR connection
/notificationHub?access_token=JWT
   |
   v
JWT middleware validates token
   |
   v
NotificationHub obtains user claims
   |
   v
Connection joins group user:{userId}
   |
   +---------------------------------------------+
   |                                             |
   |                                New domain event / app action
   |                                             |
   |                                             v
   |                               InAppNotificationService
   |                               1. Save to Notifications table
   |                               2. Push notificationReceived
   |                                             |
   +<--------------------------------------------+
   |
   v
Frontend receives realtime event
   |
   +--> Update badge / toast / list immediately
   |
   +--> If needed, later request snapshot or paging
```

---

## 15. Tư duy thiết kế hệ thống realtime trong thực tế

Nếu tóm gọn thành một `mental model`, có thể nhớ 5 câu hỏi sau:

1. Sự kiện nào tạo ra thay đổi?
2. Dữ liệu gốc được lưu ở đâu?
3. Đối tượng nào cần nhận update?
4. Kiểm soát quyền truy cập dữ liệu này như thế nào?
5. Nếu client miss event thì đồng bộ lại bằng cách nào?

### Nguyên tắc cốt lõi

- Realtime là `delivery channel`, không phải `source of truth`.
- Hub nên mỏng, service nên chứa business logic.
- Authentication phải hoạt động được cho transport của hub.
- Authorization phải check theo resource, không chỉ theo user hợp lệ.
- Group naming nên map theo nghiệp vụ, không theo `ConnectionId`.
- Hệ thống phải được thiết kế cho offline, reconnect, duplicate, scale-out.
- Security trong realtime cần `defense in depth`.

---

## 16. Checklist thực chiến cho một tính năng realtime mới

Khi xây một tính năng realtime mới, có thể dùng checklist này:

- Đã xác định `source of truth` chưa?
- Event có cần lưu `DB` trước khi push không?
- Client sẽ nhận event theo user, group hay broadcast?
- Group join có authorization check chưa?
- Token có được đọc đúng cho hub transport chưa?
- Đã tính đến reconnect và token refresh chưa?
- Nếu user offline, dữ liệu có load lại được không?
- Payload có gọn nhẹ không?
- Đã tính duplicate delivery chưa?
- Đã có logging, metrics, trace, correlation id chưa?
- Nếu scale nhiều instance, đã có backplane hoặc broker chưa?
- Có cơ chế rate limiting / abuse protection chưa?

---

## 17. Kết luận

Phần customize `security` cho realtime không phải là việc thêm cho có, mà là một phần bản chất của thiết kế realtime an toàn.

Khi chuyển từ HTTP sang `WebSocket`/`SignalR`, ta không chỉ đổi transport, mà đang đổi cả cách sự kiện được vận chuyển, identity được duy trì, và quyền truy cập được áp dụng trên một kết nối sống.

Một hệ thống realtime tốt thường có đầy đủ các đặc điểm sau:
- Kết nối sống ổn định.
- Auth và authz rõ ràng.
- Persistence bền vững.
- Reconnect và offline-friendly.
- Routing theo group/user hợp lý.
- Scale-out sẵn sàng.
- Observability đầy đủ.
- Hub mỏng, domain logic tách riêng.

Đó là tư duy nên có khi thiết kế các tính năng như:
- notifications
- chat
- live comments
- collaboration
- presence
- moderation dashboard
- live metrics

---

## 18. Cập nhật mới: các lỗi vừa gặp, vì sao xảy ra, và cách đã fix

Phần này bổ sung các vấn đề thực tế vừa gặp trong quá trình nối `NotificationHub`, frontend SignalR, và luồng follower notification khi tạo bài viết.
Nó được viết theo kiểu dễ tra cứu: hiện tượng, nguyên nhân, cách fix, phương án khác, và bài học thiết kế.

### 18.1. Client không nhận được notification dù backend đã `SendAsync`

#### Hiện tượng
Frontend kết nối được, nhưng khi backend push notification thì UI không nhận callback.

#### Nguyên nhân
Tên event giữa backend và frontend bị lệch nhau.

Backend đang push:
- `notificationReceived`
- `notificationsRead`

Frontend trước đó lại lắng nghe:
- `ReceiveNotification`
- `ReceiveNotifications`

`SignalR` match event name theo đúng chuỗi. Chỉ cần sai tên, sai hoa-thường, hay sai số ít/nhiều là callback không bao giờ chạy.

#### Cách đã fix
Đồng bộ `event contract` giữa hai bên.
Frontend được đổi sang lắng nghe đúng các event mà backend đang phát:
- `notificationReceived`
- `notificationsRead`

#### Phương án fix khác
- Tạo constants dùng chung cho event names ở cả frontend và backend.
- Định nghĩa một tài liệu contract event riêng, ví dụ `realtime-events.md`.
- Nếu hệ thống lớn hơn, có thể dùng `schema-first contract` hoặc `code generation`.

#### Bài học thiết kế
Trong realtime, event contract là API contract.
Không nên xem tên event là chi tiết nhỏ, vì thực tế nó là một phần của integration boundary.

---

### 18.2. `Failed to fetch` khi `hubConnection.start()`

#### Hiện tượng
Frontend báo lỗi:
- `Failed to complete negotiation with the server`
- `TypeError: Failed to fetch`

Lỗi xảy ra ngay lúc `hubConnection.start()`.

#### Nguyên nhân
Frontend đang connect tới sai `base URL` runtime.
Cụ thể:
- frontend từng trỏ đến `https://localhost:7150`
- trong khi backend lúc đang chạy thực tế lại reachable ở `http://localhost:5019`

Với SignalR, lỗi sai host/port/protocol sẽ vỡ ngay từ bước `negotiate`, nên chưa kịp vào hub method.

#### Cách đã fix
Chỉnh lại `apiBaseUrl` fallback của frontend về đúng runtime đang chạy.

#### Phương án fix khác
- Không hardcode fallback URL, mà bắt buộc phải có `NEXT_PUBLIC_API_BASE_URL` trong env.
- Tách riêng `NEXT_PUBLIC_SIGNALR_BASE_URL` nếu backend API và realtime gateway khác nhau.
- Dùng reverse proxy/frontend gateway để frontend chỉ nhìn thấy một origin duy nhất.

#### Bài học thiết kế
Lỗi `negotiate` thường là lỗi tầng network/runtime:
- sai port
- sai protocol
- CORS
- reverse proxy
- HTTPS cert
- auth middleware chưa đọc token

Cần tách biệt rõ:
- lỗi connect/negotiate
- lỗi auth
- lỗi invoke method
- lỗi event contract

---

### 18.3. `GetMyNotifications` fail dù connection đã lên

#### Hiện tượng
Frontend connect hub thành công, nhưng khi invoke `GetMyNotifications` lại lỗi:
- `Failed to invoke 'GetMyNotifications' due to an error on the server`

#### Nguyên nhân có khả năng cao đã gặp trong quá trình này
Có nhiều khả năng, và đã xảy ra hơn một vấn đề nối tiếp nhau:

1. Bảng `Notifications` chưa có trong database.
2. Process backend đang chạy là bản cũ, chưa restart sau khi sửa code hub.
3. Signature hub method chưa thân thiện với cách SignalR bind argument.

#### Cách đã fix
- Đã tạo migration cho `Notifications`.
- Đã kiểm tra `database update`.
- Đã đổi public hub methods thành signature gọn hơn, không để `CancellationToken` trong tham số public của method.
- Đã restart backend để process mới nhận code mới.

#### Phương án fix khác
- Bao bọc hub method bằng `try/catch` và ném `HubException` để frontend thấy thông điệp rõ hơn.
- Log structured exception ở hub và service.
- Viết `health-check` nhỏ cho luồng realtime / notification persistence.

#### Bài học thiết kế
Trong SignalR, một lỗi `Failed to invoke ... due to an error on the server` là một umbrella error.
Cần chia bước debug như sau:
1. Kết nối `negotiate` có thành công không?
2. Auth có hợp lệ không?
3. Method có bind argument đúng không?
4. Bên trong method có truy cập DB/broker/service nào bị lỗi không?
5. Process đang chạy có phải bản code mới nhất không?

---

### 18.4. Notification không lưu xuống DB khi tạo bài viết

#### Hiện tượng
Tạo bài viết xong nhưng không thấy có row mới trong bảng `Notifications`.
Không thấy follower nhận được notification realtime.

#### Nguyên nhân
Notification trong hệ thống hiện tại không được tạo trực tiếp ngay bên trong `CreateArticle`.
Luồng đi là:
1. `CreateArticle` tạo post
2. build `ArticleCreatedIntegrationEvent`
3. publish lên Kafka
4. `KafkaEventConsumer` nhận event
5. consumer gọi `INotification.SendNotificationAsync(...)`
6. lúc đó mới save `Notifications` vào DB và push SignalR

Tức là nếu Kafka consumer không chạy hoặc không xử lý được event thì:
- không lưu DB
- không push realtime
- không có follower notification

#### Cách đã fix / nội dung đã bổ sung
- Event `ArticleCreatedIntegrationEvent` được mở rộng thêm `FollowerUserIds`
- `KafkaEventConsumer` được nối thêm với `INotification`
- Khi consume event, consumer sẽ:
  - gửi email cho follower
  - tạo `in-app notification` cho follower
  - push SignalR nếu follower đang online

#### Phương án fix khác
- Bỏ qua Kafka, gọi trực tiếp `INotification` ngay trong `CreateArticle`
- Dùng `outbox pattern` thay vì publish thẳng lên Kafka
- Tách `email` và `in-app notification` thành 2 consumer riêng

#### So sánh nhanh các hướng

##### Hướng 1: Gọi trực tiếp trong `CreateArticle`
Ưu điểm:
- dễ hiểu
- debug dễ
- thấy kết quả ngay

Nhược điểm:
- coupling cao
- request chậm hơn
- dễ phình service nếu có nhiều kênh fanout

##### Hướng 2: Event qua Kafka như hiện tại
Ưu điểm:
- tách `business action` và `fan-out`
- scale tốt hơn
- retry được
- dễ thêm email/push/mobile/analytics

Nhược điểm:
- debug khó hơn
- phụ thuộc broker/consumer
- cần observability tốt

##### Hướng 3: Outbox pattern
Ưu điểm:
- bền vững hơn về mặt consistency
- tránh trường hợp save DB thành công nhưng publish event thất bại

Nhược điểm:
- phức tạp hơn
- cần worker quét outbox

#### Bài học thiết kế
Nếu một tính năng realtime cần persistence và fanout qua broker, cần nhớ:
- DB action gốc
- event publication
- broker health
- consumer health
- downstream notification service
- client connectivity

Chỉ cần một mắt xích hỏng là user thấy như “không có notification”.

---

### 18.5. Mark-as-read đang sai UX và không tối ưu

#### Hiện tượng
Ban đầu frontend mark read theo từng item, và còn tạo connection mới mỗi lần mark read.
Điều này có 3 vấn đề:
- UX chưa đúng với mong muốn “mở notification là đã đọc”
- nhiều round-trip không cần thiết
- code frontend phức tạp và tồn tại connection thừa

#### Cách đã fix
Đã đổi sang mô hình `batch mark-read`:
- backend nhận `List<int>` notification ids
- frontend khi mở dropdown sẽ lấy toàn bộ unread ids và gọi một lần `MarkNotificationAsRead`
- backend update batch trong DB
- backend push event `notificationsRead` về client với danh sách ids đã đọc
- client cập nhật state theo list đó

#### Vì sao fix này tốt hơn
- đúng UX mong muốn: mở panel là đã đọc
- giảm số request realtime
- giảm số lần mở/đóng connection phụ
- đồng bộ state dễ hơn giữa client và server

#### Phương án fix khác
- Mark read chỉ khi click từng item
- Mark read khi item vào viewport
- Mark read sau N giây panel mở
- Mark read optimistic ở client rồi sync batch theo timer

#### Hướng phù hợp cho các bài toán khác nhau
- Notification center: mở panel là đã đọc, hợp lý
- Chat app: mở conversation là đã đọc theo message range, hợp lý hơn
- Audit/security alerts: nên yêu cầu explicit acknowledgement, không nên auto-read

#### Bài học thiết kế
`Read` là một nghiệp vụ UX, không chỉ là một flag kỹ thuật.
Cần quy định rõ:
- thế nào là “đã đọc”
- thế nào là “đã xem”
- thế nào là “đã acknowledge”

Ba khái niệm này có thể giống nhau trong app nhỏ, nhưng thường tách nhau trong hệ thống lớn.

---

### 18.6. Notification đã tới UI nhưng người dùng “không thấy gì”

#### Hiện tượng
Ngay cả khi event đã đến frontend, người dùng vẫn cảm thấy “không có notification”.

#### Nguyên nhân
Lúc đầu frontend chỉ:
- update badge
- cập nhật dropdown list

Nó chưa:
- hiện toast nổi trong app
- hiện native browser notification
- mở panel tự động
- phát âm thanh

Nên nếu user không bấm vào icon chuông, họ sẽ nghĩ là không có thông báo.

#### Cách đã fix
Đã bổ sung:
- toast nổi trong app khi có `notificationReceived`
- browser native notification nếu đã được cấp permission

#### Phương án fix khác
- chỉ dùng toast
- chỉ dùng native browser notification
- thêm âm thanh nhẹ
- thêm animation/badge pulse cho icon chuông
- thêm “notification center” page riêng

#### Bài học thiết kế
Delivery đến client không đồng nghĩa với `perceivable UX`.
Trong realtime cần phân biệt:
- event đã tới client chưa?
- state đã update chưa?
- user có nhìn thấy không?

---

### 18.7. Hướng customize và phát triển tiếp theo

Phần notification hiện tại đã ở mức dùng được, nhưng để đi xa hơn có thể phát triển theo các hướng sau.

#### A. Notification payload giàu nghĩa hơn
Hiện tại payload chủ yếu có:
- id
- message
- isRead
- createdAt

Có thể mở rộng thêm:
- `title`
- `href`
- `thumbnail`
- `actorUserId`
- `actorDisplayName`
- `entityType`
- `entityId`
- `notificationType`

#### B. Notification type system
Nên có enum/type rõ ràng, ví dụ:
- `article.created`
- `comment.created`
- `comment.replied`
- `follow.created`
- `system.warning`

#### C. Unread count từ backend
Hiện tại frontend tính unread count từ local state.
Có thể nâng cấp thành:
- unread count query từ backend
- unread count update realtime
- lưu cache Redis nếu tải cao

#### D. Paging / cursor cho notification center
Nếu số notification nhiều, cần:
- pagination
- cursor-based loading
- lazy loading
- read by range/cursor

#### E. Presence-aware fanout
Nếu user offline:
- vẫn save DB
- không cần websocket push thành công

Nếu user online:
- save DB + push realtime

#### F. Retry và dead-letter cho event pipeline
Với Kafka/consumer:
- cần retry policy
- cần log payload lỗi
- cần dead-letter topic nếu xử lý thất bại nhiều lần

#### G. Notification preferences
Người dùng có thể chọn:
- nhận email hay không
- nhận in-app hay không
- nhận browser push hay không
- mute một số loại thông báo

#### H. Notification aggregate service
Nếu notification phức tạp hơn, có thể tách một application service riêng cho:
- build payload
- choose channel
- dedupe
- priority
- preference check
- persistence
- fanout

#### I. Outbox + Inbox pattern
Nếu cần độ tin cậy cao, có thể phát triển:
- `Outbox` cho event phát ra từ domain
- `Inbox` / `processed-event tracking` ở consumer

Mục tiêu:
- giảm duplicate xử lý
- tăng reliability
- audit được đường đi của event

---

### 18.8. Checklist debug nhanh cho các lỗi notification về sau

Khi notification “không chạy”, có thể debug theo thứ tự này:

1. Action gốc có xảy ra chưa?
   Ví dụ: post đã tạo thành công chưa?

2. Event đã được publish chưa?
   Kiểm tra log publisher.

3. Broker/coordinator có sống không?
   Kafka/Redis/database có khởi động không?

4. Consumer có consume event không?
   Kiểm tra log consumer.

5. Danh sách recipient có rỗng không?
   Ví dụ follower ids/email follower có thật sự tồn tại không?

6. Notification service có save DB thành công không?
   Kiểm tra bảng `Notifications`.

7. Hub có push đúng group không?
   Group name có khớp user đang login không?

8. Client có đang connect không?
   Token có hợp lệ không? Event names có khớp không?

9. UI có hiển thị đủ rõ không?
   Có toast? badge? dropdown? native notification?

10. Read-state có đồng bộ đúng không?
   Mark-read có update batch, update DB, update UI và push event về lại không?

Checklist này rất hữu ích khi hệ thống đã có nhiều lớp bất đồng bộ.
