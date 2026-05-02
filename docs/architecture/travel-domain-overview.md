# Travel Domain Overview

## Mục đích
- Cung cấp bối cảnh domain cấp cao cho product travel đang được đặc tả.
- Làm rõ boundary để tránh mở rộng spec ngoài phạm vi đã khóa.

## Product scope cấp cao
- Accommodation booking: tìm kiếm, đánh giá lựa chọn và đặt nơi lưu trú.
- Transport booking: đặt các phương tiện di chuyển được nêu trong scope hiện tại, gồm vé máy bay, xe đón và xe thuê.
- Nearby utilities: hiển thị và hỗ trợ tiếp cận các tiện ích xung quanh phục vụ hành trình.

## Bounded contexts mức tối thiểu
- `Accommodation`
  Chịu trách nhiệm cho inventory lưu trú, thông tin phòng/nơi ở, availability và booking intent của lưu trú.
- `Transport Booking`
  Chịu trách nhiệm cho inventory và booking intent của vé máy bay, xe đón và xe thuê.
- `Nearby Utilities`
  Chịu trách nhiệm cho việc phát hiện, tổ chức và hiển thị các điểm tiện ích xung quanh điểm đến hoặc nơi lưu trú.

## Actor chính
- Traveler: người tìm kiếm, so sánh và đặt dịch vụ.
- System admin/operations: tồn tại ở cấp hệ thống nhưng không nằm trong scope nghiệp vụ chi tiết của change này.
- External providers: nhà cung cấp inventory hoặc dữ liệu bổ sung. Cách kết nối chưa được khóa trong change này.

## Integration boundaries
- Payment, pricing engine, cancellation policy engine, CRM, loyalty, notification orchestration và backoffice workflow đều chưa được khóa trong change này.
- Change hiện tại chỉ yêu cầu spec nghiệp vụ cấp product; không mở rộng sang hợp đồng kỹ thuật hoặc tích hợp chi tiết.

## Glossary cơ sở
- Accommodation booking: hành động đặt nơi lưu trú cho một hành trình.
- Transport booking: hành động đặt phương tiện di chuyển trong hành trình.
- Nearby utility: điểm dịch vụ hỗ trợ quanh điểm đến hoặc nơi lưu trú, ví dụ tiện ích phục vụ chuyến đi.

## Giới hạn hiện tại
- Chưa có quyết định về phạm vi địa lý, mô hình tồn kho, chính sách hoàn hủy và mức độ realtime của giá/availability.
- Các nội dung trên phải được ghi thành `Open Issues` trong change cụ thể nếu cần để review.
