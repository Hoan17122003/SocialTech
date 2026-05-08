# Travel Traceability

| Business Goal | Capability | Business Rule / Constraint | Acceptance Criteria Reference | Open Issue Reference |
| --- | --- | --- | --- | --- |
| Cho phép traveler đặt nơi lưu trú | Accommodation booking | Chỉ mô tả nghiệp vụ cấp cao, không tự khóa pricing/payment/cancellation | Accommodation booking | TRV-OI-01, TRV-OI-02, TRV-OI-06 |
| Cho phép traveler đặt phương tiện di chuyển | Transport booking | Chỉ gồm vé máy bay, xe đón, xe thuê trong scope hiện tại | Transport booking | TRV-OI-01, TRV-OI-04, TRV-OI-05, TRV-OI-06 |
| Hỗ trợ traveler tiếp cận tiện ích xung quanh | Nearby utilities | Nearby utilities chỉ được khóa ở mức hỗ trợ quyết định, không mặc định có booking | Nearby utilities | TRV-OI-03, TRV-OI-07 |
| Khóa đúng phạm vi travel core | Governance | Mọi deliverable đều nằm dưới `docs/changes/travel/`; `spec-pack.md` là `Single Source of Truth` | Governance | TRV-OI-08, TRV-OI-09 |

## Cách dùng tài liệu này
- Dùng bảng này để kiểm tra mỗi capability đều có business goal, rule/constraint và acceptance criteria rõ ràng.
- Nếu có yêu cầu mới không map được vào bảng này, cần xem lại xem đó là mở rộng scope hay một `Open Issue` mới.
