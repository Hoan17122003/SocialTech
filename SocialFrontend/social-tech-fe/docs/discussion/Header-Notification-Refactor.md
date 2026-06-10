# Refactor `AppHeader` và `NotificationCenter`

## 1. Mục tiêu tài liệu

Tài liệu này dùng để ghi lại hướng refactor phần `AppHeader`, đặc biệt là khối `notification`, để phục vụ cho phần `tech discussion` trong dự án.

Tài liệu tập trung vào:

- Vấn đề của thiết kế cũ.
- Mục tiêu của lần refactor.
- Cách chia lại `component`, `hook` và `utils`.
- Lợi ích kỹ thuật sau khi tách.
- Những điểm có thể tiếp tục cải thiện ở các vòng sau.

---

## 2. Bối cảnh trước khi refactor

Trước khi tách, file `src/shared/navigation/app-header.tsx` đang ôm gần như toàn bộ trách nhiệm của header:

- Render layout của header.
- Render các `nav item`.
- Xử lý `logout`.
- Xử lý `theme toggle`.
- Quản lý toàn bộ state của `notification`.
- Tạo `SignalR connection`.
- Đồng bộ `localStorage`.
- Hiển thị `toast notification`.
- Hiển thị `notification panel`.
- Xử lý click outside.
- Xử lý mark read, mark all read, clear all.

Điều này làm cho `AppHeader` trở thành một file quá lớn, khó đọc và khó review. Khi một file vừa chứa nhiều `JSX`, vừa chứa nhiều `useEffect`, vừa chứa nhiều business flow, việc bảo trì sẽ ngày càng nặng theo thời gian.

---

## 3. Vấn đề chính của thiết kế cũ

### 3.1. Một `component` gánh quá nhiều trách nhiệm

`AppHeader` không còn là một `layout component` đơn thuần nữa, mà đang kiêm luôn vai trò:

- `container component`
- `realtime orchestrator`
- `notification state manager`
- `toast renderer`
- `dropdown renderer`

Đây là dấu hiệu khá rõ của việc vi phạm nguyên tắc `single responsibility`.

### 3.2. `JSX` dài làm che mất luồng xử lý

Khi đọc file cũ, phần `JSX` của `notification panel` rất dài. Điều này làm các xử lý quan trọng như:

- khởi tạo `SignalR`
- xử lý `notificationReceived`
- xử lý `notificationsRead`
- đồng bộ `localStorage`

bị chìm vào trong một file UI, khiến người đọc khó nắm được luồng chính.

### 3.3. Khó tái sử dụng

Các phần như:

- `notification bell button`
- `notification item`
- `toast notification`
- logic map payload từ `SignalR`

đều có thể đứng độc lập, nhưng trước đây đang bị nhúng cứng vào `AppHeader`.

### 3.4. Khó test và khó debug

Khi logic `SignalR`, `localStorage`, browser `Notification API` và `UI event` nằm chung một chỗ, việc debug theo từng lớp sẽ khó hơn. Ví dụ:

- lỗi ở phần `transport` hoặc `connection lifecycle`
- lỗi ở phần mapping payload
- lỗi ở phần render item

đều buộc phải lần trong cùng một file lớn.

---

## 4. Mục tiêu của lần refactor

Mục tiêu của refactor không phải là đổi behavior, mà là chia lại cấu trúc để code dễ hiểu hơn và dễ mở rộng hơn.

Các mục tiêu cụ thể:

- Giữ nguyên behavior hiện tại của header.
- Tách riêng `notification` ra khỏi `AppHeader`.
- Đưa phần stateful logic vào `hook`.
- Đưa phần mapping và storage helper vào `utils`.
- Chia `UI` thành các `component` nhỏ theo đúng vai trò.
- Làm cho `AppHeader` quay về đúng vai trò của một `shell component`.

---

## 5. Cấu trúc sau khi refactor

Sau khi refactor, phần `notification` được chia thành các file sau:

### 5.1. `notification-center.types.ts`

Vai trò:

- Chứa `NotificationItem`
- Chứa `SignalRNotificationPayload`
- Chứa `ToastNotification`

Lợi ích:

- Tách `type` ra khỏi `component`.
- Các file khác có thể import chung mà không bị phụ thuộc vào `AppHeader`.

### 5.2. `notification-center.utils.ts`

Vai trò:

- Mapping payload từ `SignalR` sang `NotificationItem`
- Xử lý format thời gian
- Đọc dữ liệu từ `localStorage`
- Ghi dữ liệu vào `localStorage`

Lợi ích:

- Tách các hàm thuần khỏi `UI`.
- Dễ kiểm tra lại logic mapping nếu backend đổi payload.

### 5.3. `use-notification-center.ts`

Vai trò:

- Là `hook` trung tâm cho notification flow.
- Quản lý `notifications`, `toastNotifications`, `isNotifOpen`.
- Khởi tạo `SignalR connection`.
- Lắng nghe event `notificationReceived` và `notificationsRead`.
- Xử lý `mark as read`, `mark all read`, `clear all`.
- Đồng bộ state với `localStorage`.

Lợi ích:

- Toàn bộ behavior được gom về một nơi.
- `component` render chỉ cần nhận state và callback.
- Dễ đọc hơn nhiều so với nhét tất cả vào `AppHeader`.

### 5.4. `notification-bell-button.tsx`

Vai trò:

- Render nút chuông thông báo.
- Hiển thị `badge unread count`.

### 5.5. `notification-panel.tsx`

Vai trò:

- Render `dropdown panel`.
- Render trạng thái rỗng.
- Render action `Doc tat ca` và `Xoa het`.
- Render danh sách item qua `NotificationListItem`.

### 5.6. `notification-list-item.tsx`

Vai trò:

- Render từng notification item.
- Hiển thị icon theo `type`.
- Xử lý click vào item.
- Xử lý toggle read/unread theo từng item.

### 5.7. `notification-toast-list.tsx`

Vai trò:

- Render danh sách `toast notification`.
- Tách hẳn phần toast ra khỏi panel để giảm độ dài `JSX`.

### 5.8. `notification-center.tsx`

Vai trò:

- Là `component` composition cho toàn bộ khu vực notification.
- Kết nối `useNotificationCenter` với các `presentational component`.

### 5.9. `app-header.tsx`

Sau refactor, `AppHeader` chỉ còn các trách nhiệm chính:

- Render logo
- Render `nav item`
- Render `Search`
- Render `NotificationCenter`
- Render `logout`
- Render `theme toggle`

Đây là trạng thái hợp lý hơn rất nhiều cho một `header component`.

---

## 6. Hướng tư duy refactor được áp dụng

Refactor lần này đi theo hướng chia theo vai trò thay vì chia theo kích thước file.

### 6.1. Tách `stateful logic` khỏi `UI`

Phần nào liên quan đến:

- `useEffect`
- `useState`
- `useRef`
- `SignalR lifecycle`
- `localStorage sync`

thì đưa vào `hook`.

Phần nào chỉ có nhiệm vụ render:

- button
- panel
- item
- toast list

thì giữ dưới dạng `presentational component`.

### 6.2. Tách `pure function` khỏi `component`

Các hàm như:

- format thời gian
- map `type`
- normalize payload
- đọc/ghi `localStorage`

không cần bám vào vòng đời của React, nên đưa sang `utils`.

### 6.3. Giữ `composition root` mỏng

`NotificationCenter` đóng vai trò là `composition root` của phần notification. `AppHeader` chỉ việc mount nó vào đúng vị trí trong layout.

Tư duy này giúp:

- giảm độ kết dính giữa header và notification
- dễ thay notification bằng implementation khác nếu cần
- dễ tách tiếp sang `feature` riêng trong tương lai

---

## 7. Lợi ích kỹ thuật sau refactor

### 7.1. Dễ đọc hơn

Người đọc mới nhìn vào `AppHeader` sẽ hiểu ngay cấu trúc tổng thể của header mà không phải cuộn qua hàng trăm dòng notification logic.

### 7.2. Dễ review hơn

Khi có thay đổi trong notification:

- thay `UI` thì chủ yếu sửa `component`
- thay behavior thì chủ yếu sửa `hook`
- thay mapping payload thì chủ yếu sửa `utils`

Phạm vi review nhỏ hơn và rõ hơn.

### 7.3. Dễ bảo trì hơn

Các thay đổi sau này như:

- thêm filter notification
- thêm tab `All` / `Unread`
- thêm optimistic update
- thay `toast` animation

sẽ ít ảnh hưởng tới `AppHeader`.

### 7.4. Dễ debug hơn

Khi có bug, có thể khoanh vùng nhanh hơn:

- bug render item: kiểm tra `notification-list-item.tsx`
- bug panel: kiểm tra `notification-panel.tsx`
- bug flow realtime: kiểm tra `use-notification-center.ts`
- bug dữ liệu: kiểm tra `notification-center.utils.ts`

### 7.5. Tạo tiền đề để test tốt hơn

Về sau có thể:

- test `utils` như `toNotificationItem`
- test `hook` bằng `React Testing Library`
- test `component` theo từng phần nhỏ

Trong khi nếu giữ mọi thứ trong một file lớn, test sẽ khó cô lập hơn nhiều.

---

## 8. Điểm đáng chú ý trong phần kỹ thuật

### 8.1. Vẫn giữ nguyên behavior hiện tại

Refactor lần này ưu tiên an toàn, nên chưa thay đổi flow nghiệp vụ:

- vẫn dùng `SignalR`
- vẫn dùng `localStorage`
- vẫn dùng browser `Notification`
- vẫn mark read khi mở panel

Điểm này quan trọng trong `tech discussion`: đây là refactor về cấu trúc, không phải rewrite behavior.

### 8.2. Có chuẩn bị tốt hơn cho việc xử lý `SignalR lifecycle`

Do phần realtime đã được gom vào `use-notification-center`, các thay đổi sau này như:

- chống `race condition`
- kiểm soát `start/stop`
- fallback transport
- log connection state

sẽ dễ làm hơn vì không phải chỉnh trực tiếp trong `AppHeader`.

### 8.3. Chưa tách notification thành `feature` riêng

Hiện tại notification vẫn đang ở `src/shared/navigation/`, vì nó đang gắn chặt với header layout.

Tuy nhiên nếu sau này notification phát triển mạnh hơn, có thể cân nhắc đẩy sang một module riêng, ví dụ:

`src/features/notifications/`

Khi đó `header` chỉ import `NotificationCenter` từ feature này.

---

## 9. Đề xuất cho các bước tiếp theo

Sau refactor cấu trúc, có thể tiếp tục cải thiện theo các hướng sau:

### 9.1. Tách `message button` nếu cần

Hiện trong header vẫn còn một khối `message` là `inline JSX`. Nếu phần này còn mở rộng, nên tách thành `MessageShortcutButton`.

### 9.2. Tách `nav item` thành `component`

Nếu phần navigation còn tiếp tục tăng, có thể tách:

- `HeaderNavItem`
- `HeaderNav`

để giảm thêm độ dài cho `AppHeader`.

### 9.3. Chuẩn hóa text hiển thị

Một số text hiện tại vẫn đang hard-code trong `component`. Về lâu dài có thể gom lại thành:

- `constants`
- `i18n resource`

nếu dự án cần đa ngôn ngữ hoặc cần chuẩn hóa wording.

### 9.4. Tách `notification action` sang service layer nếu flow lớn hơn

Nếu sau này notification không chỉ `read/unread` mà còn có:

- pagination
- archive
- delete theo item
- fetch theo filter

thì nên cân nhắc thêm một lớp `notifications-api.ts` hoặc `notifications-service.ts`.

---

## 10. Kết luận

Refactor lần này đi theo đúng tinh thần:

- `AppHeader` chỉ làm việc của header
- `hook` quản lý behavior
- `utils` xử lý dữ liệu thuần
- `component` nhỏ chịu trách nhiệm render

Điểm giá trị lớn nhất không nằm ở việc giảm số dòng, mà nằm ở việc làm cho kiến trúc dễ hiểu hơn, dễ mở rộng hơn và an toàn hơn cho những thay đổi tiếp theo.

Nếu cần trình bày ngắn trong `tech discussion`, có thể tóm lại bằng một câu:

`AppHeader` trước đây đang là một "god component", và hướng refactor là tách notification thành một `composition module` gồm `hook + utils + presentational components` để giảm coupling và tăng maintainability.
