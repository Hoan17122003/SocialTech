# Social Spec Pack

## Tuyên bố nguồn chân lý
- Tài liệu này là `Single Source of Truth` cho social domain của `SocialTech`.
- Mục tiêu là định nghĩa domain nghiệp vụ, functional requirements cấp sản phẩm và các boundary chính trước khi mở rộng sang API, CQRS, event hoặc workflow kỹ thuật chi tiết.

## Bối cảnh
`SocialTech` được định hướng là một social network theo mô hình community-driven: người dùng tạo tài khoản, tham gia community, đăng post, thảo luận qua comment, reaction nội dung, chat trực tiếp và nhận notification theo các tương tác quan trọng.

## Business goals
- Cho phép xây dựng feed nội dung dựa trên community, quan hệ follow và tương tác của user.
- Cho phép người dùng trao đổi công khai qua comment và riêng tư qua chat.
- Cho phép moderation đủ mạnh để vận hành cộng đồng an toàn.
- Tạo domain model đủ rõ để đội backend có thể implement bằng `Entity Framework` một cách bền vững.

## In-scope
- User registration, login và quản lý profile cơ bản.
- Community, membership, role, rule và visibility.
- Post text, link, media.
- Comment dạng thread.
- Reaction cho post, comment và message.
- Direct message giữa user.
- Follow user, block user, mute content.
- Notification cho các tương tác chính.
- Report cho post/comment/message/user.
- Feed cơ bản theo community và follow.
- Tag cho post.

## Out-of-scope
- Voice/video call.
- Livestream.
- Ads, billing, subscription.
- Recommendation engine chi tiết theo machine learning.
- Search ranking algorithm chi tiết.
- Backoffice moderation workflow chi tiết ở cấp thao tác vận hành.

## Actor chính
- `Guest`
- `User`
- `Moderator`
- `Owner`
- `System`

## Capability map
### 1. Identity
- Đăng ký tài khoản, đăng nhập và duy trì phiên người dùng.
- Quản lý profile cơ bản, avatar, bio và thiết lập quyền riêng tư cơ bản.

### 2. Community
- Tạo và quản lý community.
- Quản lý visibility, membership, role và rule.
- Duyệt yêu cầu tham gia nếu community ở chế độ hạn chế.

### 3. Content
- Tạo post thuộc community.
- Gắn tag và đính kèm media cho post.
- Tạo comment, reply comment, chỉnh sửa và xóa mềm nội dung.

### 4. Engagement
- Reaction cho post, comment và message.
- Tổng hợp score, comment count, member count và reaction count.

### 5. Relationship
- Follow user, unfollow user.
- Block user hoặc mute nội dung từ user/community.

### 6. Messaging
- Tạo conversation giữa user.
- Gửi, nhận, đọc và reaction tin nhắn.

### 7. Notification
- Tạo notification khi có comment mới, reaction mới, follow mới và message mới.

### 8. Moderation
- Report post, comment, message hoặc user.
- Gán moderator xử lý report và theo dõi report status.

## End-to-end business flows
### Flow 1: Tạo tài khoản và tham gia social graph
1. Guest đăng ký tài khoản.
2. System xác thực thông tin tối thiểu và tạo hồ sơ user.
3. User cập nhật profile cơ bản.
4. User follow một số user hoặc tham gia một số community.
5. Feed khởi tạo dựa trên community đã tham gia và quan hệ follow.

### Flow 2: Tạo nội dung và thảo luận
1. User chọn community phù hợp.
2. User tạo post kèm text, media hoặc tag.
3. System lưu post và cập nhật feed hiển thị.
4. User khác mở post, tạo comment hoặc reply.
5. System lưu comment thread, cập nhật comment count và tạo notification liên quan.

### Flow 3: Tương tác nội dung
1. User xem post, comment hoặc message.
2. User chọn reaction phù hợp.
3. System ghi nhận reaction nếu hợp lệ theo rule uniqueness.
4. System cập nhật reaction count và phát notification nếu cần.

### Flow 4: Chat trực tiếp
1. User mở hồ sơ của user khác hoặc từ danh sách chat.
2. User tạo conversation mới hoặc tiếp tục conversation hiện có.
3. User gửi message.
4. System lưu message, cập nhật trạng thái conversation và gửi notification cho người nhận.
5. Người nhận mở conversation, đọc message và hệ thống cập nhật read status.

### Flow 5: Moderation
1. User report post, comment, message hoặc user.
2. System tạo `ContentReport` hoặc `UserReport`.
3. Moderator review ngữ cảnh và cập nhật quyết định xử lý.
4. Nội dung có thể bị ẩn, giới hạn hoặc giữ nguyên tùy quyết định moderation.

## Business rules đã được khóa
- Community là đơn vị tổ chức trung tâm của phần lớn nội dung công khai.
- Post không tồn tại ngoài community nếu chưa có thiết kế riêng cho profile feed.
- Comment không tồn tại ngoài post.
- Membership là nơi lưu role trong community.
- Mỗi user chỉ có tối đa một reaction cùng loại trên mỗi target tại một thời điểm.
- Quan hệ follow là một chiều; block có thể chặn khả năng chat và hiển thị nội dung.
- Mỗi message phải thuộc một conversation hợp lệ.
- Reaction tin nhắn chỉ hợp lệ nếu user có quyền truy cập conversation đó.
- Report phải có một và chỉ một target nghiệp vụ.

## Acceptance criteria
### Identity
- Domain mô tả rõ user registration, login session và profile cơ bản.

### Community
- Domain mô tả rõ community, membership, role, rule, visibility và join flow cơ bản.

### Content
- Domain mô tả rõ post, comment, media, tag và quan hệ giữa chúng.

### Engagement
- Domain mô tả rõ reaction model cho post, comment và message.

### Relationship
- Domain mô tả rõ follow, block và mute ở mức business behavior.

### Messaging
- Domain mô tả rõ conversation, message, read status và message reaction.

### Notification
- Domain mô tả rõ các trigger notification chính và đầu ra mong đợi ở mức nghiệp vụ.

### Moderation
- Domain mô tả rõ report target, moderator assignment và report status.

### Persistence
- Các entity có thể map sang `Entity Framework` mà không cần suy luận thêm về khóa ngoại hoặc quan hệ cơ bản.

## Dependencies and constraints
- Ưu tiên model dễ đọc, dễ bảo trì và dễ mở rộng hơn là optimize sớm.
- Chưa đưa vào domain các logic recommendation phức tạp hoặc anti-abuse engine nâng cao.
- Không đưa chi tiết API contract vào tài liệu này.
- Chat trong phase này được mô tả ở mức functional/business flow, chưa khóa transport layer realtime cụ thể.

## Tài liệu hỗ trợ SDD
- Danh sách functional requirements, task ID, mô tả luồng và đầu ra được chi tiết hóa tại `docs/changes/social/functional-requirements-sdd.md`.

## Open Issues
- Có cần community `restricted join approval` chi tiết hơn không?
- Feed ưu tiên community hay follow trong phase đầu?
- Reaction set chuẩn gồm các loại nào ngoài `like`?
- Chat có hỗ trợ group conversation trong phase đầu hay chỉ 1-1?
- Notification có cần in-app only hay thêm email/push trong phase tiếp theo?
- Có cần thêm `saved posts`, `share post` và `bookmark` trong phase tiếp theo không?
