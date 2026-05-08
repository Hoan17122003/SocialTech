# Phase 0 Review

## Thông tin chung
- Branch tại thời điểm review: `main`
- Scope được cung cấp: nghiệp vụ cốt lõi travel gồm đặt nơi lưu trú, đặt phương tiện di chuyển và tiện ích xung quanh
- Timebox: `30 minute`

## Hiện trạng repo
- Workspace chưa có thư mục `docs/`.
- Chưa tồn tại `docs/maintenance/phase0/README.md` và `docs/maintenance/phase0/phase0-review.md`.
- Chưa tồn tại `docs/standards/` và `docs/architecture/`.
- Chưa tồn tại `docs/changes/travel/spec-pack.md`.
- Ứng dụng backend hiện tại là khung ASP.NET API, chưa thể hiện travel domain.

## Bằng chứng đã đọc
- `SocialBackEnd/Program.cs`: chỉ cấu hình controller, Swagger, DI, middleware cơ bản.
- `SocialBackEnd/Domain/Entities/Article.cs`: entity mẫu cho domain article.
- `SocialBackEnd/Presentation/Controllers/ArticleController.cs`: controller placeholder, chưa có travel use case.
- `SocialBackEnd/Application/Services/ArticleServiceImpl.cs`: service placeholder, chưa có nghiệp vụ travel.

## Đánh giá gap
- Gap 1: Thiếu bộ khung tài liệu để mở change mới theo quy tắc `Single Source of Truth`.
- Gap 2: Chưa có living documents về standards và architecture để thống nhất cách viết spec.
- Gap 3: Chưa có domain overview cho travel để khóa boundary giữa accommodation, transport booking và nearby utilities.
- Gap 4: Chưa có spec-pack cho travel core nên chưa thể review requirement hoặc traceability một cách nhất quán.

## Kết luận
- Repo cần Phase 0 bootstrap trước khi coi travel spec là hợp lệ.
- Việc bootstrap docs trong change này là cần thiết và phù hợp với quy tắc lưu deliverables.

## Gap cần xử lý trong change này
- Tạo living document tối thiểu cho spec authoring standards.
- Tạo living document tối thiểu cho travel domain overview.
- Tạo spec pack, open issues và traceability cho change `travel`.
- Giữ mọi điểm chưa đủ thông tin ở trạng thái `Open Issues`, không tự khóa thay product owner.
