# Hướng Dẫn Tái Cấu Trúc Thiết Kế Giao Diện (Layout Redesign Guide)

Tài liệu này ghi nhận chi tiết thiết kế, kiến trúc giao diện mới và các cải tiến thẩm mỹ đã được thực thi trên ứng dụng SocialTech nhằm mang lại trải nghiệm chuyên nghiệp, thân thiện cho cả lập trình viên (Developer) lẫn người dùng phổ thông (Non-tech).

---

## 1. Hệ Thống Theme & Hiệu Ứng Chuyển Đổi (Theme System & View Transitions)

### 1.1. Chế Độ Dark/Light Toàn Diện
*   **Source of Truth:** Sử dụng CSS variables (`--background`, `--surface`, `--line`, `--accent`, v.v.) được định nghĩa trong `src/app/globals.css`.
*   **Tên Class Kích Hoạt:** Sử dụng class `.dark` tại thẻ `<html>` gốc để chuyển đổi theme trên toàn bộ phần tử.
*   **Trạng Thái Khởi Tạo:** Tự động đọc và lưu cấu hình người dùng lựa chọn vào `localStorage` và class trên thẻ HTML tại `src/providers/theme-provider.tsx`.

### 1.2. Hiệu Ứng Chuyển Đổi Cuộn Từ Trái Sang Phải (Wipe Transition)
*   **Công Nghệ Sử Dụng:** **View Transitions API** (`document.startViewTransition`) để chụp frame cũ và vẽ frame mới theo thời gian thực.
*   **Mô Phỏng Animation (Wipe Effect):**
    ```css
    ::view-transition-old(root) {
        animation: none;
        mix-blend-mode: normal;
    }
    ::view-transition-new(root) {
        animation: reveal-left-to-right 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
        mix-blend-mode: normal;
        clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%);
    }
    ```
*   **Hoạt Động:** Khi click nút chuyển theme ở góc trên cùng bên phải, giao diện sẽ xuất hiện hiệu ứng quét màu mượt mà quét từ cạnh trái màn hình sang cạnh phải.

---

## 2. Các Thành Phần Giao Diện Toàn Cục (Global Layout Components)

### 2.1. Thanh Điều Hướng Header (`src/shared/navigation/app-header.tsx`)
*   **Tích Hợp Icon Trực Quan:** Bổ sung các icon SVG thu nhỏ vào cạnh nhãn điều hướng (ví dụ: Icon Dashboard, Icon Tạo bài viết, v.v.).
*   **Cải Tiến Thẩm Mỹ:** Sử dụng viền ngăn cách mảnh `.border-b` cùng hiệu ứng làm mờ kính nền `.backdrop-blur-md` tạo cảm giác lơ lửng và thanh thoát.

### 2.2. Floating Action Menu (FAB - `src/shared/layout/app-shell.tsx`)
*   **Mô Tả:** Nút hành động nổi ở góc dưới bên phải màn hình hiển thị menu phím tắt tính năng nhanh khi hover.
*   **Cơ Chế Cascade Hover:** Khi hover vào nút chính (hình bánh răng hoặc menu), các phím tắt (Trang chủ, Hồ sơ, Tạo bài viết, Đăng nhập) sẽ được bung ra theo thứ tự trễ tăng dần (`transition-delay: 50ms, 100ms...`), tạo nhịp điệu chuyển động rất bắt mắt.
*   **Tooltip Trực Quan:** Mỗi icon phím tắt đi kèm một tooltip nhỏ xuất hiện bên cạnh để hướng dẫn người dùng không rành công nghệ.

---

## 3. Thiết Kế Lại Các Trang Nghiệp Vụ (Page Redesigns)

### 3.1. Trang Đăng Nhập & Đăng Ký (`src/features/auth/components/`)
*   **Phong Cách Glassmorphism:** Card màu nền mờ nhạt chống lóa kèm viền phát sáng nhẹ, đổ bóng mịn màng.
*   **Icon Ô Nhập Liệu:** Đưa các biểu tượng trực quan vào bên trong ô nhập liệu (Email $\rightarrow$ `@` hoặc lá thư; Mật khẩu $\rightarrow$ Chìa khóa hoặc ổ khóa) giúp người dùng non-tech nhận biết nhanh chóng.
*   **Developer Hints:** Thêm nhãn mô tả API ở góc thẻ biểu mẫu dạng `POST /api/User/login` để hỗ trợ lập trình viên Frontend & Backend nắm bắt được DTO endpoint đang tương tác.

### 3.2. Trang Dashboard (`src/app/(workspace)/dashboard/page.tsx`)
*   **Card Modules Phát Sáng:** Các module chức năng được phân tách thành các khối phát sáng hover-card, nền kính `.glow-card`. Khi di chuột qua, thẻ sẽ phóng to nhẹ (`scale-102`), viền card sáng lên màu chủ đạo của module.
*   **Bảng Điều Hướng Nhanh (Quick Navigation):** Sắp xếp các phím tắt dạng viên thuốc (pill tags) bo góc tròn lớn với icon tương ứng giúp thao tác một chạm nhanh.

### 3.3. Trang Cá Nhân (`src/features/users/components/profile-panel.tsx`)
*   **Phân Quyền & Bảo Mật (Authorization):**
    *   *Chủ sở hữu (Owner):* Xuất hiện nút Cấu hình (biểu tượng bánh răng) ở góc trên bên phải thẻ thông tin cá nhân.
    *   *Người xem khác (Visitor):* Nút bánh răng bị ẩn hoàn toàn và chỉ hiển thị thông tin hồ sơ cơ bản (Avatar, tên hiển thị, bio, các thống kê lượt follow, bài đăng gần đây). Không có quyền chỉnh sửa.
*   **Popup Modal Cấu Hình (Settings Modal):**
    *   Khi click vào nút bánh răng, một Popup Modal nền kính mờ `backdrop-blur-sm` xuất hiện ở trung tâm màn hình.
    *   Hỗ trợ chuyển đổi nhanh hai Tab điều khiển:
        1.  *Cá nhân hóa (Profile):* Thay đổi Display Name, Bio, đăng tải Avatar mới.
        2.  *Bảo mật & Hệ thống:* Cập nhật mật khẩu mới, bật/tắt chế độ tài khoản riêng tư (Private Account) và chuyển đổi nhanh Light/Dark mode trực tiếp trên popup.
*   **Bố Cục Căn Giữa Sạch Sẽ:** Trang cá nhân được định dạng hiển thị thành một cột trung tâm thanh thoát, tập trung trải nghiệm đọc bài viết và xem thông tin cá nhân.

### 3.4. Trình Soạn Thảo Bài Viết (`src/features/articles/components/article-composer.tsx`)
*   **Hai Cột Chuyên Nghiệp:** Layout chuẩn cho CMS thời đại mới:
    *   *Cột Trái (Sidebar Cấu Hình):* Điều phối metadata (Tiêu đề, Community, Trạng thái xuất bản), Nút chọn chế độ soạn thảo (Standard/Tech), Upload ảnh/video đính kèm và nhóm nút Submit/Reset.
    *   *Cột Phải (Không Gian Viết Bài):* Vùng soạn thảo văn bản chiếm diện tích lớn. Ở chế độ Tech (Markdown), hỗ trợ Tab viết và Tab xem trước (Live Preview) mượt mà có hỗ trợ double-click để quay lại chế độ viết nhanh.

### 3.5. Chi Tiết Bài Viết (`src/features/articles/components/article-detail-card.tsx`)
*   **Phong Cách Tạp Chí:** Khung thẻ nội dung bao bọc sạch sẽ, tiêu đề lớn, phần thông tin tác giả chuyên nghiệp có ảnh đại diện viết tắt tên (Initials Avatar).
*   **Khối File Đính Kèm:** Các attachment liên kết tải về được render thành các thẻ riêng biệt có logo loại file cùng icon Download ở góc phải thay vì dòng chữ URL thô.

---

## 4. Kết Luận
Bản tái cấu trúc thiết kế này giúp hệ thống **SocialTech** đạt được điểm nhấn thị giác cao, tuân thủ chặt chẽ nguyên lý thiết kế ứng dụng hiện đại, thân thiện trên mọi thiết bị và tạo nền tảng vững chắc cho đội ngũ tiếp tục xây dựng các tính năng nâng cao tiếp theo.
