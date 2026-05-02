# Social Functional Requirements SDD

## Mục tiêu
- Phân rã social domain thành các yêu cầu chức năng có mã task để tiện review, estimation và implementation planning.
- Mỗi chức năng được mô tả ở mức business/functional: mục đích, actor, luồng chính và đầu ra mong đợi.

## Quy ước mã task
- Tiền tố `TF` = `Task Function`.
- Dải `TF10012` trở đi được dùng cho social functional requirements trong phase hiện tại.
- Các mục gắn nhãn `[Đề xuất]` là tính năng hợp lý cho social network nhưng chưa mặc định khóa scope release.

## Danh sách chức năng

### TF10012 - Tạo tài khoản người dùng
- Mô tả: Cho phép guest đăng ký tài khoản mới để tham gia hệ thống.
- Actor: `Guest`
- Luồng chính:
1. Guest nhập username, email hoặc số định danh đăng nhập và mật khẩu.
2. System kiểm tra dữ liệu bắt buộc, tính duy nhất và format hợp lệ.
3. System tạo `User` và hồ sơ mặc định.
4. Guest nhận trạng thái đăng ký thành công và có thể đi tiếp sang đăng nhập hoặc onboarding.
- Đầu ra:
  Tài khoản mới được tạo, có `UserId`, hồ sơ cơ bản và trạng thái sẵn sàng sử dụng.

### TF10013 - Đăng nhập và khởi tạo phiên
- Mô tả: Cho phép user truy cập hệ thống bằng tài khoản đã tồn tại.
- Actor: `User`
- Luồng chính:
1. User nhập credential.
2. System xác thực thông tin.
3. System tạo phiên đăng nhập hợp lệ.
4. User được điều hướng vào trang chính và nhìn thấy feed cá nhân hóa cơ bản.
- Đầu ra:
  Phiên đăng nhập hợp lệ và context user sẵn sàng cho các chức năng khác.

### TF10014 - Cập nhật hồ sơ cá nhân
- Mô tả: Cho phép user chỉnh sửa profile như tên hiển thị, avatar, bio và thông tin công khai.
- Actor: `User`
- Luồng chính:
1. User mở trang hồ sơ.
2. User chỉnh sửa các trường cho phép.
3. System kiểm tra dữ liệu hợp lệ.
4. System lưu thay đổi và cập nhật phần hiển thị profile.
- Đầu ra:
  Hồ sơ cá nhân được cập nhật và phản ánh trên các điểm chạm hiển thị liên quan.

### TF10015 - Tạo community
- Mô tả: Cho phép user tạo một community theo chủ đề cụ thể.
- Actor: `User`
- Luồng chính:
1. User nhập tên community, mô tả ngắn, visibility và rule cơ bản.
2. System kiểm tra trùng lặp tên định danh.
3. System tạo `Community`, gán user là `Owner`.
4. Community sẵn sàng để mời hoặc cho phép user khác tham gia.
- Đầu ra:
  Community mới được tạo với owner, rule và visibility ban đầu.

### TF10016 - Tham gia hoặc rời community
- Mô tả: Cho phép user tham gia, yêu cầu tham gia hoặc rời một community.
- Actor: `User`
- Luồng chính:
1. User mở trang community.
2. User chọn join hoặc leave.
3. System xử lý theo visibility của community.
4. Nếu community hạn chế, system tạo yêu cầu chờ duyệt.
- Đầu ra:
  Trạng thái membership được cập nhật thành tham gia, chờ duyệt hoặc đã rời.

### TF10017 - Tạo bài viết
- Mô tả: Cho phép user đăng post text, link hoặc media trong community.
- Actor: `User`
- Luồng chính:
1. User chọn community.
2. User nhập nội dung, tag và media nếu có.
3. System kiểm tra quyền đăng, dữ liệu bắt buộc và trạng thái community.
4. System lưu post và đưa vào feed liên quan.
- Đầu ra:
  Post mới được tạo, có thể hiển thị trên feed và trang community.

### TF10018 - Chỉnh sửa hoặc xóa mềm bài viết
- Mô tả: Cho phép tác giả hoặc moderator chỉnh sửa, ẩn hoặc xóa mềm post.
- Actor: `User`, `Moderator`
- Luồng chính:
1. Actor có quyền mở thao tác quản lý post.
2. Actor chọn edit hoặc soft delete.
3. System kiểm tra quyền và ghi nhận thay đổi.
4. Feed và chi tiết post phản ánh trạng thái mới.
- Đầu ra:
  Post được cập nhật nội dung hoặc đổi trạng thái hiển thị.

### TF10019 - Bình luận và trả lời bình luận
- Mô tả: Cho phép user thảo luận theo dạng thread dưới một post.
- Actor: `User`
- Luồng chính:
1. User mở chi tiết post.
2. User nhập comment gốc hoặc reply vào comment con.
3. System lưu quan hệ cha-con của comment.
4. System cập nhật comment count và tạo notification nếu cần.
- Đầu ra:
  Comment mới xuất hiện đúng vị trí trong thread thảo luận.

### TF10020 - React bài viết
- Mô tả: Cho phép user thả reaction lên post.
- Actor: `User`
- Luồng chính:
1. User chọn một post.
2. User chọn loại reaction.
3. System kiểm tra uniqueness của reaction theo user và target.
4. System lưu mới, thay đổi hoặc gỡ reaction.
- Đầu ra:
  Reaction count của post được cập nhật và có thể phát notification cho tác giả.

### TF10021 - React bình luận
- Mô tả: Cho phép user thả reaction lên comment.
- Actor: `User`
- Luồng chính:
1. User chọn comment.
2. User chọn loại reaction.
3. System xác thực quyền xem comment và tính hợp lệ của reaction.
4. System cập nhật reaction state.
- Đầu ra:
  Comment phản ánh reaction mới và chỉ số tương tác được cập nhật.

### TF10022 - Theo dõi user
- Mô tả: Cho phép user follow hoặc unfollow user khác để hình thành social graph.
- Actor: `User`
- Luồng chính:
1. User mở hồ sơ user khác.
2. User chọn follow hoặc unfollow.
3. System cập nhật quan hệ follow một chiều.
4. Feed và gợi ý nội dung cá nhân hóa có thể dùng dữ liệu này.
- Đầu ra:
  Quan hệ follow được ghi nhận và có thể tạo notification cho người được follow.

### TF10023 - Chặn user hoặc mute nội dung
- Mô tả: Cho phép user tự bảo vệ trải nghiệm bằng block user hoặc mute content.
- Actor: `User`
- Luồng chính:
1. User chọn block hoặc mute tại hồ sơ user hay community.
2. System ghi nhận rule hiển thị tương ứng.
3. Nội dung hoặc tương tác từ target bị giới hạn theo policy.
4. Chat và notification liên quan được điều chỉnh nếu có block.
- Đầu ra:
  Luật hiển thị cá nhân được cập nhật, giảm nội dung không mong muốn.

### TF10024 - Tạo cuộc trò chuyện trực tiếp 1-1
- Mô tả: Cho phép user mở direct message với user khác.
- Actor: `User`
- Luồng chính:
1. User mở hồ sơ user khác.
2. User chọn nhắn tin.
3. System kiểm tra block rule và tạo hoặc tái sử dụng `Conversation`.
4. User được đưa tới màn hình chat.
- Đầu ra:
  Một conversation hợp lệ tồn tại giữa hai user.

### TF10025 - Gửi tin nhắn
- Mô tả: Cho phép user gửi text hoặc media trong conversation.
- Actor: `User`
- Luồng chính:
1. User mở conversation.
2. User nhập nội dung và gửi message.
3. System xác thực quyền tham gia conversation.
4. System lưu message, cập nhật thứ tự hội thoại và trạng thái gửi.
- Đầu ra:
  Message mới xuất hiện trong conversation và sẵn sàng cho người nhận đọc.

### TF10026 - Đánh dấu đã xem tin nhắn
- Mô tả: Cho phép system và user đồng bộ trạng thái đã xem trong chat.
- Actor: `User`, `System`
- Luồng chính:
1. User mở conversation có message chưa đọc.
2. System xác định các message đủ điều kiện chuyển sang đã xem.
3. System cập nhật read status theo participant.
4. UI hiển thị trạng thái đã xem phù hợp.
- Đầu ra:
  Conversation có trạng thái read chính xác cho từng phía.

### TF10027 - React tin nhắn
- Mô tả: Cho phép user thả reaction lên message trong chat.
- Actor: `User`
- Luồng chính:
1. User chọn message trong conversation.
2. User chọn reaction.
3. System kiểm tra user có quyền truy cập conversation.
4. System lưu, cập nhật hoặc gỡ reaction.
- Đầu ra:
  Message phản ánh reaction mới và người nhận có thể thấy cập nhật tương tác.

### TF10028 - Nhận notification tương tác
- Mô tả: Cho phép user nhận notification khi có sự kiện quan trọng.
- Actor: `System`, `User`
- Luồng chính:
1. Một sự kiện như comment mới, follow mới, reaction mới hoặc message mới phát sinh.
2. System xác định user nhận notification.
3. System tạo notification item.
4. User mở notification center để xem và điều hướng đến target.
- Đầu ra:
  Notification được lưu và hiển thị đúng ngữ cảnh.

### TF10029 - Báo cáo nội dung hoặc người dùng
- Mô tả: Cho phép user report post, comment, message hoặc user vi phạm.
- Actor: `User`
- Luồng chính:
1. User chọn report trên target.
2. User chọn lý do và gửi báo cáo.
3. System tạo record report.
4. Report được đưa vào hàng đợi moderation.
- Đầu ra:
  Một report hợp lệ được tạo và sẵn sàng cho moderator xử lý.

### TF10030 - Xử lý moderation
- Mô tả: Cho phép moderator review report và đưa ra quyết định.
- Actor: `Moderator`
- Luồng chính:
1. Moderator mở hàng đợi report.
2. Moderator xem ngữ cảnh nội dung và lịch sử liên quan.
3. Moderator chọn hành động: giữ nguyên, ẩn, xóa mềm, giới hạn hoặc cảnh báo.
4. System cập nhật trạng thái report và target liên quan.
- Đầu ra:
  Quyết định moderation được ghi nhận và áp dụng lên target.

### TF10031 - Xem feed tổng hợp
- Mô tả: Cho phép user xem feed dựa trên community đã tham gia và user đang follow.
- Actor: `User`
- Luồng chính:
1. User mở trang chủ.
2. System lấy tập nội dung từ community membership và social graph.
3. System sắp xếp theo rule feed của phase hiện tại.
4. User cuộn và tương tác với nội dung.
- Đầu ra:
  Feed có danh sách post phù hợp với quan hệ và cộng đồng của user.

### TF10032 - Tìm kiếm community hoặc user
- Mô tả: Cho phép user tìm nhanh các entity phổ biến trong hệ thống.
- Actor: `User`, `Guest`
- Luồng chính:
1. Actor nhập từ khóa tìm kiếm.
2. System truy vấn user/community phù hợp.
3. System trả kết quả theo nhóm.
4. Actor chọn kết quả để điều hướng.
- Đầu ra:
  Danh sách user/community khớp với từ khóa.

## Chức năng đề xuất

### TF10033 - [Đề xuất] Lưu bài viết
- Mô tả: Cho phép user bookmark post để đọc lại.
- Cách hoạt động: User chọn lưu trên post, system gắn quan hệ `User + SavedPost`.
- Đầu ra:
  Danh sách bài đã lưu của user được cập nhật.

### TF10034 - [Đề xuất] Chia sẻ bài viết
- Mô tả: Cho phép user chia sẻ post vào community khác, gửi qua chat hoặc lấy link.
- Cách hoạt động: User chọn hành động share, system tạo deep-link hoặc share record theo ngữ cảnh.
- Đầu ra:
  Link chia sẻ hoặc một bản ghi share được tạo.

### TF10035 - [Đề xuất] Ghim bài trong community
- Mô tả: Cho phép owner hoặc moderator ghim post quan trọng.
- Cách hoạt động: Moderator chọn pin trên post, system đưa post lên khu vực ưu tiên của community.
- Đầu ra:
  Post được đánh dấu pinned và hiển thị ưu tiên trong community.

### TF10036 - [Đề xuất] Mention user trong comment hoặc post
- Mô tả: Cho phép user gọi tên user khác bằng cú pháp mention.
- Cách hoạt động: System parse mention token, liên kết với user hợp lệ và tạo notification.
- Đầu ra:
  Nội dung hiển thị mention có thể nhấp vào và người được mention nhận notification.

### TF10037 - [Đề xuất] Nhóm chat nhiều người
- Mô tả: Mở rộng từ direct message sang conversation nhiều participant.
- Cách hoạt động: User tạo conversation mới, chọn nhiều user, system quản lý participant và role trong conversation.
- Đầu ra:
  Group conversation mới được tạo và hỗ trợ gửi/đọc/reaction message.

### TF10038 - [Đề xuất] Story hoặc trạng thái ngắn hạn
- Mô tả: Cho phép user đăng nội dung tồn tại trong thời gian ngắn để tăng mức độ hoạt động.
- Cách hoạt động: User tạo story với TTL xác định, system tự ẩn sau khi hết hạn.
- Đầu ra:
  Story hiển thị trong khoảng thời gian hiệu lực rồi tự biến mất.

## Ghi chú implementation planning
- `TF10012` đến `TF10019` là nền tảng cốt lõi cho identity, community và content.
- `TF10020` đến `TF10028` là nhóm engagement, relationship, messaging và notification.
- `TF10029` đến `TF10032` là nhóm moderation và discovery.
- `TF10033` trở đi là backlog đề xuất, nên được gắn nhãn `proposed` khi lập kế hoạch release.
