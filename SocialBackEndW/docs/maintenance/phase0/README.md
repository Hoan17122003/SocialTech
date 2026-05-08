# Phase 0 Bootstrap Guide

## Mục tiêu
- Xác nhận repo đã có đủ nền tài liệu để mở một thay đổi mới mà không phải suy đoán.
- Thiết lập quy tắc lưu trữ tài liệu để mỗi deliverable đều được tìm thấy tại một nơi rõ ràng.
- Bảo đảm mỗi change có một `Single Source of Truth` trước khi đi vào implementation.

## Repo readiness criteria
Repo được xem là sẵn sàng mở spec mới khi thỏa tất cả điều kiện sau:
- Có `docs/changes/<change>/spec-pack.md` đóng vai trò `Single Source of Truth` cho change.
- Có tài liệu living docs cần thiết dưới `docs/architecture/` và `docs/standards/`.
- Có tài liệu Phase 0 ghi nhận hiện trạng và gap nếu đây là lần đầu bootstrap docs.
- Mọi điểm mơ hồ, quyết định chưa khóa hoặc phạm vi chưa rõ đều được đưa vào `Open Issues`, không trộn vào requirement chính thức.

## Single Source of Truth
- Đối với mỗi thay đổi, nguồn chân lý duy nhất là `docs/changes/<change>/spec-pack.md`.
- Các file khác trong `docs/changes/<change>/` chỉ đóng vai trò hỗ trợ review, traceability và quản lý `Open Issues`.
- `docs/architecture/` và `docs/standards/` là living documents, dùng để tái sử dụng bối cảnh và quy chuẩn dùng chung, không thay thế spec-pack.

## Vị trí lưu deliverables
- Deliverable theo từng thay đổi: `docs/changes/<change>/`
- Living documents về kiến trúc: `docs/architecture/`
- Living documents về quy chuẩn/spec authoring: `docs/standards/`
- Tài liệu kiểm tra readiness và hiện trạng bootstrap: `docs/maintenance/phase0/`

## Quy trình mở change mới
1. Đọc `docs/maintenance/phase0/` để xác nhận repo readiness và các gap hiện hữu.
2. Đọc `docs/standards/` và `docs/architecture/` để dùng đúng template, thuật ngữ và boundary.
3. Tạo `docs/changes/<change>/spec-pack.md` và ghi rõ phạm vi, business goals, acceptance criteria và `Open Issues`.
4. Chỉ bổ sung requirement khi có cơ sở rõ ràng từ prompt, context đã đọc hoặc quyết định đã được khóa.
5. Nếu thiếu thông tin, ghi thành `Open Issues`; không được tự ý điền chi tiết bằng giả định.

## Áp dụng cho travel change
- Change hiện tại: `travel`
- Scope được khóa: nghiệp vụ cốt lõi đặt nơi lưu trú, đặt phương tiện di chuyển và tiện ích xung quanh.
- Ngoài phạm vi nếu chưa có yêu cầu bổ sung: loyalty, CMS, social feed, moderation, backoffice operations, API contract chi tiết và data schema chi tiết.
