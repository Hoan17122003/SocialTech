# Social Domain Overview

## Mục đích
- Định nghĩa domain nghiệp vụ cốt lõi cho `SocialTech` theo mô hình social network kết hợp community-driven platform.
- Tạo một boundary rõ ràng để team business, backend và data cùng nhìn cùng một ngôn ngữ.

## Tư duy product
- Sản phẩm xoay quanh các cộng đồng theo chủ đề, hồ sơ người dùng và tương tác thời gian gần thực.
- Người dùng tham gia community, đăng bài, bình luận, reaction, chat và theo dõi nhau để tạo độ gắn kết.
- Moderation là capability cốt lõi, không phải phần phụ trợ.

## Bounded contexts đề xuất
- `Identity`
  Quản lý tài khoản người dùng, hồ sơ cơ bản, trạng thái xác thực, quyền riêng tư tài khoản và phiên đăng nhập.
- `Community`
  Quản lý community, rule, thành viên, vai trò moderator/owner, visibility và trạng thái tham gia.
- `Content`
  Quản lý post, media, tag, comment, comment thread, chỉnh sửa nội dung và trạng thái hiển thị.
- `Engagement`
  Quản lý vote/reaction cho post, comment, message và các chỉ số tương tác tổng hợp.
- `Relationship`
  Quản lý follow, block, mute và các ràng buộc hiển thị liên quan đến quan hệ giữa user.
- `Messaging`
  Quản lý direct message, conversation, delivery status, read status và reaction trong tin nhắn.
- `Moderation`
  Quản lý report, hàng đợi review, quyết định xử lý và audit log moderation.
- `Notification`
  Quản lý notification theo sự kiện như comment mới, reaction mới, follow mới và message mới.

## Actor chính
- `Guest`: xem một phần nội dung công khai.
- `User`: tạo post, comment, reaction, chat, follow, tham gia community.
- `Moderator`: duyệt report, ẩn/xóa nội dung, quản lý thành viên trong community.
- `Owner`: tạo community, định nghĩa rule, bổ nhiệm moderator.
- `System`: phát notification, cập nhật feed, đồng bộ trạng thái đọc và ghi nhận audit.

## Aggregate roots chính
- `User`
  Thực thể đại diện cho danh tính social, hồ sơ cơ bản và trạng thái hoạt động của người dùng.
- `Community`
  Trung tâm tổ chức nội dung theo chủ đề. Mọi `Post` cộng đồng đều thuộc một community.
- `Post`
  Đơn vị nội dung chính trên feed. Hỗ trợ text, link, media và metadata tương tác.
- `Comment`
  Đơn vị thảo luận theo dạng tree, cho phép reply lồng nhau.
- `Conversation`
  Phiên trao đổi giữa hai hoặc nhiều user, giữ ngữ cảnh tin nhắn và trạng thái thành viên.
- `Message`
  Đơn vị nội dung trong chat, hỗ trợ text, media, reaction, trạng thái gửi/đã xem.
- `Notification`
  Đơn vị thông báo gắn với một sự kiện nghiệp vụ và một user nhận thông báo.
- `ContentReport`
  Đơn vị moderation để moderator xử lý nội dung hoặc hành vi bị báo cáo.

## Quy tắc domain cần giữ rõ
- Mỗi `Post` phải thuộc đúng một `Community` hoặc một ngữ cảnh profile feed đã được định nghĩa rõ.
- Mỗi `Comment` phải thuộc đúng một `Post`.
- Vote hoặc reaction là duy nhất theo cặp `User + Target + ReactionType` tùy loại target.
- Thành viên trong community được quản lý riêng qua `CommunityMembership`, không đặt role trực tiếp trên `User`.
- Quan hệ follow là một chiều; block có ưu tiên cao hơn follow trong logic hiển thị và chat.
- Mỗi `Message` phải thuộc đúng một `Conversation`.
- `MessageReaction` chỉ được tạo trên message còn hiển thị và từ user đang là thành viên conversation.
- Report chỉ trỏ vào một mục tiêu tại một thời điểm: `Post`, `Comment`, `Message`, `User` hoặc `Community`.
- Notification được tạo từ domain event, không phải nguồn dữ liệu gốc của nghiệp vụ.

## Giá trị của model này
- Dễ đọc: tên entity trùng với ngôn ngữ nghiệp vụ.
- Dễ mở rộng: có sẵn chỗ cho chat, reaction, follow, notification và moderation.
- Dễ ORM hóa: quan hệ 1-n, n-n, self-reference đều rõ ràng cho `Entity Framework`.
