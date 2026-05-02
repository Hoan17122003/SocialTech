# Travel Open Issues

## Nguyên tắc
- Danh sách này ghi lại các điểm chưa đủ dữ liệu để khóa trong `spec-pack.md`.
- Khi chưa có quyết định, không được đẩy nội dung này thành requirement chính thức.

## Open issues
| ID | Câu hỏi mở | Tác động nếu chưa khóa |
| --- | --- | --- |
| TRV-OI-01 | Mô hình thanh toán cho accommodation và transport booking là gì? | Ảnh hưởng flow booking, confirmation và phạm vi tích hợp |
| TRV-OI-02 | Chính sách hoàn hủy, đổi lịch và refund có nằm trong release scope hay không? | Ảnh hưởng business rules, post-booking flow và phạm vi support |
| TRV-OI-03 | Phạm vi địa lý của sản phẩm là gì? | Ảnh hưởng inventory, localization, compliance và nearby utilities |
| TRV-OI-04 | Inventory đến từ một hay nhiều provider? | Ảnh hưởng sourcing, freshness và khả năng mở rộng |
| TRV-OI-05 | Giá và availability cần realtime ở mức nào? | Ảnh hưởng UX, confirmation logic và kỳ vọng của traveler |
| TRV-OI-06 | Điều kiện nào đánh dấu booking là thành công? | Ảnh hưởng acceptance criteria, notification và SLA |
| TRV-OI-07 | Nearby utilities chỉ dùng để discovery hay có lộ trình giao dịch sau này? | Ảnh hưởng boundary của capability và scope release |
| TRV-OI-08 | Thứ tự ưu tiên release của ba capability chính là gì? | Ảnh hưởng roadmap và chia phase delivery |
| TRV-OI-09 | Có cần quản lý tài khoản traveler, lịch sử booking hoặc quản lý hành trình trong release này không? | Ảnh hưởng mở rộng scope ngoài travel core đã khóa |

## Các mục cần tiếp tục mở rộng nếu có thêm context
- Mức độ chi tiết của traveler profile
- Cách xử lý booking cho nhiều hành khách/người đồng hành
- Mục tiêu KPI cho conversion hoặc attachment rate giữa accommodation và transport
