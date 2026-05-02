# Travel Spec Pack

## Tuyên bố nguồn chân lý
- Tài liệu này là `Single Source of Truth` cho change `travel`.
- Các file khác trong `docs/changes/travel/` chỉ hỗ trợ review, traceability và quản lý `Open Issues`.

## Bối cảnh
Sản phẩm travel cần tập trung vào nghiệp vụ cốt lõi giúp traveler lên kế hoạch và đặt các thành phần chính của chuyến đi. Scope hiện tại được khóa ở ba nhóm capability: đặt nơi lưu trú, đặt phương tiện di chuyển và tiếp cận tiện ích xung quanh.

## Business goals
- Cho phép traveler tìm và đặt nơi lưu trú phù hợp với nhu cầu hành trình.
- Cho phép traveler tìm và đặt phương tiện di chuyển trong các nhóm đã được nêu: vé máy bay, xe đón, xe thuê.
- Hỗ trợ traveler nhận biết và tiếp cận tiện ích xung quanh liên quan đến điểm đến hoặc nơi lưu trú.
- Tạo một phạm vi product core đủ rõ để các bước thiết kế tiếp theo có thể chi tiết hóa mà không làm lệch scope.

## In-scope
- Nghiệp vụ tìm kiếm, lựa chọn và đặt nơi lưu trú.
- Nghiệp vụ tìm kiếm, lựa chọn và đặt phương tiện di chuyển trong phạm vi vé máy bay, xe đón và xe thuê.
- Khả năng hiển thị, khám phá hoặc điều hướng đến tiện ích xung quanh ở mức product capability.
- Đặc tả actor, business flow, business rules cấp cao, acceptance criteria, dependencies, constraints và open issues.

## Out-of-scope
- Loyalty, membership, rewards và referral.
- CMS, social feed, rating/review moderation và nội dung cộng đồng.
- Quy trình vận hành backoffice chi tiết.
- API contracts, schema dữ liệu, event model và persistence design chi tiết.
- Tích hợp chi tiết với payment gateway, notification provider, inventory provider hoặc pricing engine.

## Actor/persona chính
- Traveler
  Người có nhu cầu lập kế hoạch chuyến đi, so sánh lựa chọn và thực hiện đặt dịch vụ.
- Companion planner
  Người hỗ trợ traveler đánh giá lựa chọn và ra quyết định đặt, nhưng không cần thêm business rule riêng trong scope hiện tại.

## Capability map
### 1. Accommodation booking
- Traveler có thể tìm kiếm nơi lưu trú dựa trên điểm đến và thông tin hành trình.
- Traveler có thể xem thông tin lựa chọn lưu trú để ra quyết định đặt.
- Traveler có thể thực hiện booking intent cho lựa chọn lưu trú đã chọn.

### 2. Transport booking
- Traveler có thể tìm kiếm phương tiện di chuyển thuộc nhóm vé máy bay, xe đón hoặc xe thuê.
- Traveler có thể xem thông tin lựa chọn di chuyển để ra quyết định đặt.
- Traveler có thể thực hiện booking intent cho phương tiện đã chọn.

### 3. Nearby utilities
- Traveler có thể khám phá tiện ích xung quanh liên quan đến điểm đến hoặc nơi lưu trú.
- Hệ thống có thể trình bày thông tin tiện ích xung quanh ở mức hỗ trợ quyết định chuyến đi.
- Traveler có thể sử dụng thông tin tiện ích xung quanh để bổ trợ cho quyết định lưu trú hoặc di chuyển.

## End-to-end business flows
### Flow 1: Đặt nơi lưu trú
1. Traveler xác định điểm đến và nhu cầu chuyến đi.
2. Traveler tìm kiếm các lựa chọn nơi lưu trú phù hợp.
3. Traveler xem thông tin lựa chọn để so sánh và chọn một nơi lưu trú.
4. Traveler thực hiện booking intent cho lựa chọn đã chọn.
5. Hệ thống ghi nhận kết quả booking ở mức nghiệp vụ. Cách xác nhận thành công chi tiết là `Open Issue`.

### Flow 2: Đặt phương tiện di chuyển
1. Traveler xác định nhu cầu di chuyển cho hành trình.
2. Traveler chọn nhóm phương tiện phù hợp: vé máy bay, xe đón hoặc xe thuê.
3. Traveler tìm kiếm và xem các lựa chọn phương tiện di chuyển.
4. Traveler chọn một lựa chọn phù hợp.
5. Traveler thực hiện booking intent cho phương tiện đã chọn.
6. Hệ thống ghi nhận kết quả booking ở mức nghiệp vụ. Chi tiết pricing, payment và xác nhận là `Open Issues`.

### Flow 3: Khám phá tiện ích xung quanh
1. Traveler xác định điểm đến, nơi lưu trú hoặc điểm quan tâm.
2. Traveler xem các tiện ích xung quanh liên quan.
3. Traveler sử dụng thông tin này để điều chỉnh quyết định đặt lưu trú hoặc di chuyển.

## Business rules đã được khóa
- Travel core trong change này chỉ bao gồm accommodation booking, transport booking và nearby utilities.
- Transport booking trong scope hiện tại chỉ nêu rõ ba nhóm: vé máy bay, xe đón, xe thuê.
- Tiện ích xung quanh được đặc tả ở mức hỗ trợ quyết định và hành trình; không mặc định bao gồm booking cho các tiện ích đó.
- Nếu một quyết định sản phẩm chưa có đủ thông tin từ prompt hoặc context đã đọc, quyết định đó phải được đưa vào `Open Issues`.

## Acceptance criteria
### Accommodation booking
- Spec mô tả được mục tiêu nghiệp vụ, actor chính và flow cấp cao cho đặt nơi lưu trú.
- Spec phân biệt rõ phần in-scope và out-of-scope của accommodation booking.
- Spec không tự ý bổ sung chính sách giá, thanh toán, hoàn hủy hoặc inventory model nếu chưa được khóa.

### Transport booking
- Spec mô tả được scope transport gồm vé máy bay, xe đón và xe thuê.
- Spec mô tả được flow cấp cao từ tìm kiếm đến booking intent cho phương tiện di chuyển.
- Spec giữ các yếu tố chưa rõ như pricing, payment, xác nhận booking và provider sourcing ở trạng thái `Open Issues`.

### Nearby utilities
- Spec mô tả được vai trò của nearby utilities trong việc bổ trợ quyết định hành trình.
- Spec không mặc định nearby utilities có quy trình booking riêng nếu chưa được yêu cầu.
- Spec liên kết nearby utilities với accommodation hoặc transport ở mức hỗ trợ business flow.

### Governance
- Toàn bộ change được tài liệu hóa dưới `docs/changes/travel/`.
- `spec-pack.md` có thể đọc độc lập mà vẫn hiểu được business scope và các giới hạn chính.
- Mọi nội dung chưa chắc chắn đều được trỏ chiếu sang `open-issues.md`.

## Dependencies and constraints
- Change này phụ thuộc vào việc duy trì living documents trong `docs/standards/` và `docs/architecture/`.
- Repo hiện tại chưa có travel domain implementation; spec này không được dùng để suy ra sẵn kiến trúc kỹ thuật chi tiết.
- Timebox `30 minute` giới hạn mức độ chi tiết ở tầng BA/product capability.

## Open Issues
- Mô hình thanh toán cho accommodation và transport booking là gì?
- Chính sách hoàn hủy, đổi lịch và refund có nằm trong release scope hay không?
- Phạm vi địa lý và ngôn ngữ/múi giờ của sản phẩm là gì?
- Inventory sẽ đến từ nhà cung cấp nào và có cần gồm nhiều provider hay không?
- Giá và availability có cần realtime hay cho phép độ trễ nào?
- Điều kiện để một booking được xem là xác nhận thành công là gì?
- Nearby utilities sẽ chỉ là discovery information hay có deep-link / đặt chỗ cho một số utility trong tương lai?
- Thứ tự ưu tiên release giữa accommodation, transport và nearby utilities là như thế nào?
