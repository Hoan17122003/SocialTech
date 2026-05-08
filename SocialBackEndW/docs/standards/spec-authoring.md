# Spec Authoring Standard

## Mục đích
- Đảm bảo các spec có cấu trúc nhất quán, dễ review, dễ trace và không phá vỡ `Single Source of Truth`.

## Nguyên tắc bắt buộc
- Mỗi change phải có `docs/changes/<change>/spec-pack.md` là nguồn chân lý duy nhất.
- Deliverable của một change chỉ được lưu dưới `docs/changes/<change>/`.
- Không đưa chi tiết kỹ thuật, schema hoặc workflow vận hành vào spec nếu chưa được yêu cầu rõ ràng.
- Không được tự ý mở rộng scope. Mọi điểm mơ hồ phải đưa vào `Open Issues`.

## Cấu trúc tối thiểu cho spec-pack
- Bối cảnh và business goals
- In-scope / out-of-scope
- Actor/persona chính
- Capability map
- End-to-end business flows
- Business rules đã được khóa
- Feature-level acceptance criteria
- Dependencies / constraints
- Open Issues

## Cách viết assumptions và open issues
- Assumptions chỉ được ghi khi cần làm rõ bối cảnh đã biết; không dùng assumptions để biến nội dung chưa đủ thông tin thành requirement.
- `Open Issues` phải ở dạng câu hỏi hoặc quyết định còn treo.
- Mỗi `Open Issue` nên nêu rõ tác động đến scope, UX hoặc implementation nếu chưa được giải đáp.

## Cách viết acceptance criteria
- Ở mức feature hoặc capability, không đi xuống mức API contract hoặc DB schema nếu chưa cần.
- Tập trung vào kết quả nghiệp vụ có thể review được.
- Mỗi acceptance criterion phải liên kết rõ với capability hoặc business goal.

## Traceability
- Nên có bảng mapping giữa business goal, capability, business rule, acceptance criteria và open issue.
- Tài liệu traceability là tài liệu hỗ trợ review; nếu có mâu thuẫn với `spec-pack.md`, ưu tiên `spec-pack.md`.
