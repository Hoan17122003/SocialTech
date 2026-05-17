# Tài liệu tổng quan xử lý tạo bài viết hiện tại

## 1. Mục tiêu tài liệu

File này dùng để note lại toàn bộ luồng tạo bài viết ở frontend hiện tại, tập trung vào:

- Cấu trúc màn hình tạo bài viết.
- Các file code đang tham gia vào flow này.
- Thư viện đang sử dụng và mục đích sử dụng.
- Cách hoạt động của chế độ `Standard article` và `Tech article`.
- Cách xử lý Markdown, inline image preview, media attachment và submit API.
- Các kỹ thuật đã áp dụng để tránh lỗi mất preview ảnh.

Tài liệu này phù hợp để:

- Onboarding người mới vào dự án.
- Review hoặc mở rộng tính năng tạo bài viết.
- Debug các lỗi liên quan tới Markdown editor, preview ảnh và submit payload.

---

## 2. Các file code đang tham gia vào flow tạo bài viết

### 2.1 Entry page

- `src/app/(workspace)/articles/new/page.tsx`

Vai trò:

- Đây là page entry cho route tạo bài viết mới.
- Hiện tại page này chỉ render `ArticleComposer`.

```tsx
import { ArticleComposer } from '@/features/articles/components/article-composer';

export default function CreateArticlePage() {
    return <ArticleComposer />;
}
```

### 2.2 Component chính của màn hình tạo bài viết

- `src/features/articles/components/article-composer.tsx`

Vai trò:

- Đây là file trung tâm của toàn bộ UI/logic tạo bài viết.
- Quản lý state form.
- Chuyển đổi giữa `Standard article` và `Tech article`.
- Tích hợp Markdown editor.
- Xử lý ảnh chèn inline vào nội dung.
- Xử lý media đính kèm riêng.
- Render preview nội dung Markdown.
- Gọi API tạo bài viết.

### 2.3 API layer cho article

- `src/features/articles/articles-api.ts`

Vai trò:

- Đóng vai trò service để gọi backend.
- Tách logic gọi HTTP ra khỏi UI component.
- Submit payload tạo bài viết qua endpoint:
  `POST /api/Article/create`

### 2.4 Contract/type cho article

- `src/features/articles/contracts.ts`

Vai trò:

- Khai báo type cho request/response.
- Giúp component và API layer dùng thống nhất kiểu dữ liệu.

### 2.5 Utility convert payload sang FormData

- `src/common/utils/object-to-form-data.ts`

Vai trò:

- Chuyển object thường sang `FormData`.
- Hỗ trợ gửi `File[]` trong request multipart.

### 2.6 File CSS/global style có ảnh hưởng trực tiếp

- `src/app/globals.css`

Vai trò:

- Custom theme cho `@uiw/react-md-editor`.
- Style cho vùng `.article-markdown-preview`.
- Điều chỉnh giao diện preview Markdown để đồng bộ với UI toàn trang.

---

## 3. Thư viện đang sử dụng

### 3.1 `next`

Mục đích:

- Framework chính của dự án frontend.
- Quản lý routing, App Router, page structure, dynamic import.

Ứng dụng trong flow này:

- Dùng `dynamic()` để lazy-load Markdown editor ở client-only mode.

### 3.2 `react`

Mục đích:

- Quản lý state, lifecycle, event handling.

Ứng dụng trong flow này:

- `useState` để lưu form, tab, status, error, preview attachment.
- `useEffect` để đồng bộ và cleanup `object URL`.
- `useRef` để thao tác file input ẩn và giữ reference preview hiện tại.

### 3.3 `@uiw/react-md-editor`

Mục đích:

- Cung cấp Markdown editor có toolbar, live preview, code preview, write/preview mode.

Ứng dụng trong flow này:

- Render editor cho `Tech article`.
- Dùng `preview="edit"` để hiển thị song song vùng nhập và vùng preview.
- Dùng `previewOptions` để override cách render ảnh inline.
- Dùng `textareaProps` để chỉnh placeholder.
- Dùng `visibleDragbar={false}` để khóa thanh resize mặc định.

### 3.4 `react-markdown`

Mục đích:

- Render Markdown thành React component.

Ứng dụng trong flow này:

- Dùng cho tab `Preview` custom bên ngoài editor.
- Override component `img` để map ảnh từ `upload://...` sang `blob URL`.

### 3.5 `remark-gfm`

Mục đích:

- Bổ sung GitHub Flavored Markdown.

Ứng dụng trong flow này:

- Hỗ trợ list, table, strikethrough và cú pháp Markdown phổ biến hơn trong preview.

---

## 4. Tổng quan chức năng hiện tại

Màn hình tạo bài viết hiện có 2 chế độ:

### 4.1 `Standard article`

Đặc điểm:

- Dùng `Textarea` thông thường.
- Phù hợp với bài viết ngắn hoặc nội dung đơn giản.
- Không bật Markdown editor chuyên sâu.

### 4.2 `Tech article`

Đặc điểm:

- Dùng Markdown editor.
- Có nút `Write` và `Preview`.
- Có live preview ở vùng editor.
- Có thể chèn ảnh trực tiếp vào nội dung dưới dạng Markdown image syntax.
- Có thể double click ở khu preview để quay lại chế độ `Write`.

### 4.3 Media attachment riêng

Ngoài ảnh chèn inline vào nội dung Markdown, màn hình còn có khu upload media riêng:

- Nhận `image`, `video`, `gif`.
- Dữ liệu này được gửi qua trường `attachments`.
- UI hiện tại chỉ hiển thị trạng thái đã chọn bao nhiêu file, không còn block preview riêng bên dưới.

---

## 5. Cấu trúc state chính trong `ArticleComposer`

### 5.1 `form`

Kiểu:

```ts
type ArticleFormState = {
    title: string;
    content: string;
    comunityId: string;
    articleStatus: 'Draft' | 'Published';
    attachments: File[];
};
```

Ý nghĩa:

- `title`: tiêu đề bài viết.
- `content`: nội dung bài viết, có thể là text thường hoặc Markdown string.
- `comunityId`: ID community đang chọn.
- `articleStatus`: trạng thái bài viết.
- `attachments`: danh sách file đính kèm đang được lưu ở state form.

Lưu ý:

- Khi submit thật sự, frontend không lấy thẳng `form.attachments` làm nguồn duy nhất.
- Hệ thống hiện dùng `attachmentPreviews` kết hợp với `content` để xác định file nào thực sự cần gửi.

### 5.2 `articleMode`

Kiểu:

```ts
type ArticleMode = 'standard' | 'tech';
```

Ý nghĩa:

- Xác định màn hình đang ở chế độ viết thường hay viết Markdown.

### 5.3 `markdownTab`

Kiểu:

```ts
type MarkdownTab = 'write' | 'preview';
```

Ý nghĩa:

- Điều khiển tab custom phía ngoài editor.
- `write`: hiển thị Markdown editor.
- `preview`: hiển thị preview render hoàn chỉnh bằng `react-markdown`.

### 5.4 `attachmentPreviews`

Kiểu:

```ts
type AttachmentPreview = {
    id: string;
    file: File;
    kind: 'image' | 'video' | 'gif' | 'file';
    source: 'inline' | 'media';
    url: string;
};
```

Ý nghĩa:

- Đây là state rất quan trọng để quản lý preview file.
- `source: 'inline'` dùng cho ảnh được chèn vào Markdown content.
- `source: 'media'` dùng cho file upload từ khu media riêng.
- `url` là `blob URL` được tạo bằng `URL.createObjectURL(file)`.

---

## 6. Giải thích các hàm chính trong `article-composer.tsx`

Phần này mang tính "comment code bằng tài liệu", tức là giải thích vai trò từng nhóm hàm để dễ maintain.

### 6.1 `getAttachmentKind(file)`

Mục đích:

- Phân loại file thành `image`, `video`, `gif`, `file`.

Ý nghĩa kỹ thuật:

- Dùng để biết cách preview file nếu sau này cần render khác nhau.
- Giúp UI và logic dễ mở rộng.

### 6.2 `buildAttachmentId(file)`

Mục đích:

- Tạo `id` ổn định cho attachment từ tên file, `lastModified`, `size`.

Ý nghĩa kỹ thuật:

- Dùng làm khóa để liên kết giữa:
  - file upload
  - Markdown content dạng `upload://id`
  - preview map trong UI

Ví dụ:

```md
![image.png](upload://image-1766995099223-84715)
```

### 6.3 `transformMarkdownUrl(url)`

Mục đích:

- Giữ nguyên URL có scheme `upload://`.

Ý nghĩa kỹ thuật:

- Tránh để pipeline Markdown mặc định xử lý lệch ngữ cảnh của ảnh local preview.
- Đây là bước cần thiết khi frontend dùng pseudo URL thay vì URL thật từ server.

### 6.4 `extractInlineUploadIds(content)`

Mục đích:

- Quét toàn bộ Markdown content để lấy danh sách `upload ID` đang còn được tham chiếu.

Ý nghĩa kỹ thuật:

- Khi submit, frontend cần biết ảnh inline nào vẫn còn nằm trong nội dung.
- Ảnh nào không còn được tham chiếu thì không nên gửi lên backend.

### 6.5 `extractUploadPreviewId(src)`

Mục đích:

- Trích xuất `upload ID` từ `src` trong thẻ ảnh khi render preview.

Tại sao cần hàm này:

- `src` đi qua Markdown pipeline có thể bị:
  - giữ nguyên
  - encode
  - bọc bởi ký tự `< >`

Hàm này normalize lại dữ liệu để frontend vẫn map đúng sang preview local.

### 6.6 `getSubmissionAttachments(previews, content)`

Mục đích:

- Tạo danh sách file thực tế cần gửi khi submit.

Rule hiện tại:

- Nếu `source === 'media'` thì luôn gửi.
- Nếu `source === 'inline'` thì chỉ gửi khi `content` vẫn còn tham chiếu tới ảnh đó.

Ý nghĩa kỹ thuật:

- Tránh gửi dư file inline đã bị xóa khỏi nội dung.
- Tách logic submit khỏi state hiển thị đơn thuần.

### 6.7 `replaceAttachments(files)`

Mục đích:

- Thay toàn bộ nhóm media attachment hiện tại bằng danh sách file mới chọn.

Điểm cần chú ý:

- Chỉ revoke các preview thuộc nhóm `media`.
- Không đụng tới preview `inline`.

Ý nghĩa:

- Người dùng thay danh sách media riêng mà không làm mất ảnh đã chèn trong Markdown.

### 6.8 `appendAttachments(files)`

Mục đích:

- Thêm file mới vào danh sách preview `inline`.

Điểm cần chú ý:

- Có kiểm tra duplicate bằng `id`.
- Nếu file trùng thì revoke ngay `blob URL` mới tạo để tránh leak.

### 6.9 `updateContent(nextContent)`

Mục đích:

- Chỉ cập nhật `form.content`.

Lưu ý quan trọng:

- Trước đây logic này từng can thiệp xóa preview inline dựa trên nội dung hiện tại.
- Điều đó gây lỗi khi editor phát sinh state trung gian lúc xuống dòng hoặc chuyển preview.
- Hiện tại hàm này được giữ tối giản để tránh side effect ngoài ý muốn.

### 6.10 `handleInlineImageUpload(files)`

Mục đích:

- Xử lý khi người dùng chọn ảnh để chèn vào nội dung Markdown.

Flow:

1. Lọc chỉ lấy file ảnh.
2. Đưa ảnh vào `attachmentPreviews` với `source: 'inline'`.
3. Sinh Markdown image syntax.
4. Append block ảnh vào `content`.
5. Chuyển tab về `write`.

Ví dụ Markdown được sinh:

```md
![Screenshot.png](upload://screenshot-1766997545648-63460)
```

### 6.11 `resetComposer()`

Mục đích:

- Reset toàn bộ form và state về mặc định.

Điểm cần chú ý:

- Revoke tất cả `blob URL` trước khi xóa preview.

### 6.12 `handleSubmit(event)`

Mục đích:

- Submit bài viết lên backend.

Flow:

1. `preventDefault()`
2. Reset `status` và `error`
3. Set `isSubmitting = true`
4. Gọi `articlesApi.create(...)`
5. Dùng `getSubmissionAttachments(...)` để lấy danh sách file đúng
6. Nếu thành công thì reset composer
7. Nếu lỗi thì hiển thị thông báo lỗi
8. Cuối cùng set `isSubmitting = false`

---

## 7. Cơ chế render ảnh inline trong Markdown

Đây là phần quan trọng nhất của flow hiện tại.

### 7.1 Vấn đề cần giải quyết

Backend chưa trả URL public ngay tại thời điểm người dùng đang soạn bài, nhưng người dùng vẫn cần thấy preview ảnh trong lúc viết.

Giải pháp hiện tại:

- Không chèn URL server thật.
- Thay vào đó, frontend chèn một pseudo URL:

```md
![Tên ảnh](upload://attachment-id)
```

### 7.2 Cách frontend map từ Markdown sang ảnh thật để preview

Frontend giữ một `attachmentMap`:

- Key: `attachment id`
- Value: `AttachmentPreview`

Khi render Markdown:

1. Bắt thẻ `img`.
2. Lấy `src`.
3. Parse `upload ID`.
4. Tìm trong `attachmentMap`.
5. Nếu có thì đổi sang `preview.url` là `blob URL`.

### 7.3 Hai nơi cần render đồng bộ

Hiện tại có 2 hệ render preview khác nhau:

#### A. Preview tab custom

- Dùng `react-markdown`.
- Cần custom `components.img`.

#### B. Live preview của `@uiw/react-md-editor`

- Đây là preview pane bên phải trong `preview="edit"`.
- Ngoài ra còn ảnh hưởng tới các mode như `code preview`, `live preview`.
- Cần truyền `previewOptions` để editor dùng cùng logic render ảnh.

### 7.4 Kết luận kỹ thuật

Muốn ảnh inline hiển thị đúng ở mọi preview mode thì phải đồng bộ:

- `components`
- `urlTransform`
- logic parse `upload://...`

cho cả:

- `react-markdown`
- `@uiw/react-md-editor`

---

## 8. Các lỗi đã gặp và cách fix

### 8.1 Lỗi nhấn Enter làm mất preview ảnh

Nguyên nhân:

- Trước đây `updateContent()` vừa cập nhật text vừa lọc/xóa preview inline.
- Markdown editor có thể phát sinh state trung gian khi người dùng nhấn `Enter`.
- Kết quả là ảnh bị xóa khỏi state preview quá sớm.

Cách fix:

- `updateContent()` chỉ còn nhiệm vụ cập nhật text.
- Việc xác định attachment nào còn hợp lệ được dời về bước submit.

### 8.2 Lỗi ảnh bị vỡ trong preview dù Markdown vẫn còn

Nguyên nhân:

- `URL.revokeObjectURL()` từng bị gọi lại khi danh sách preview thay đổi.
- Có trường hợp ảnh vẫn đang được render nhưng `blob URL` đã bị revoke.

Cách fix:

- Dùng `attachmentPreviewsRef` để giữ snapshot mới nhất.
- Chỉ cleanup toàn bộ preview khi component unmount.
- Việc revoke theo nhóm chỉ xảy ra khi chủ động thay attachment hoặc reset form.

### 8.3 Lỗi preview của editor bên phải không hiển thị ảnh

Nguyên nhân:

- Custom render ảnh chỉ mới được áp vào tab `Preview` riêng.
- Preview pane của `@uiw/react-md-editor` có pipeline riêng.

Cách fix:

- Truyền `previewOptions={{
  components: markdownComponents,
  urlTransform: transformMarkdownUrl
}}`

Kết quả:

- Live preview
- Code preview
- Preview mode
- Tab preview custom

đều dùng chung một logic render ảnh inline.

---

## 9. Kỹ thuật đang áp dụng trong flow này

### 9.1 Dynamic import cho client-only editor

Kỹ thuật:

- `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })`

Lý do:

- Markdown editor là component phụ thuộc môi trường client/browser.
- Tránh lỗi liên quan SSR.
- Tối ưu initial render của page.

### 9.2 `blob URL` preview với `URL.createObjectURL`

Kỹ thuật:

- Tạo preview local cho file người dùng vừa chọn.

Lý do:

- Không cần upload ngay lên server mới preview được.
- UX tốt hơn khi soạn bài có ảnh.

### 9.3 Cleanup `blob URL`

Kỹ thuật:

- `URL.revokeObjectURL()`

Lý do:

- Tránh memory leak khi người dùng đổi file nhiều lần.

### 9.4 Tách `inline attachment` và `media attachment`

Kỹ thuật:

- Gắn `source: 'inline' | 'media'`

Lý do:

- Hai nhóm file có vòng đời khác nhau.
- Ảnh inline phụ thuộc vào nội dung Markdown.
- Media attachment là file đính kèm độc lập.

### 9.5 Pseudo URL scheme `upload://`

Kỹ thuật:

- Không dùng URL thật trong lúc người dùng đang soạn nội dung.
- Dùng token trung gian để map nội dung và file local.

Lý do:

- Backend chưa có asset URL thật tại thời điểm compose.
- Frontend vẫn cần preview chính xác.

### 9.6 Multipart submit bằng `FormData`

Kỹ thuật:

- Convert object sang `FormData` bằng `objectToFormData()`.

Lý do:

- Endpoint tạo bài viết nhận text + file trong cùng request.
- `attachments` là mảng `File`.

### 9.7 Custom Markdown image renderer

Kỹ thuật:

- Override `img` component khi render Markdown.

Lý do:

- Cho phép thay `upload://id` bằng `blob URL` local.
- Dễ mở rộng nếu sau này cần hỗ trợ nhiều loại media hơn.

---

## 10. Submit payload hiện tại

### 10.1 Request type

```ts
export type CreateArticleRequest = {
    title: string;
    content?: string;
    attachments?: File[];
    comunityId?: number;
    articleStatus?: ArticleStatus;
};
```

### 10.2 Endpoint

```ts
POST /api/Article/create
```

### 10.3 Dữ liệu gửi đi

Frontend hiện gửi:

- `title`
- `content`
- `comunityId`
- `articleStatus`
- `attachments`

Lưu ý:

- `content` vẫn chỉ là string Markdown/text thông thường.
- Frontend chưa tạo file `.md`.
- Backend sẽ nhận toàn bộ nội dung ở field `content`.

---

## 11. Gợi ý comment code nếu cần maintain tiếp

Hiện tại code đã khá rõ, nhưng nếu muốn tăng khả năng maintain về sau thì nên ưu tiên comment ngắn ở các điểm sau:

- Chỗ dùng `upload://` để giải thích đây là pseudo URL cho inline preview.
- Chỗ `attachmentPreviewsRef` để giải thích vì sao không cleanup theo dependency array.
- Chỗ `getSubmissionAttachments()` để nhấn mạnh rule lọc attachment trước khi submit.
- Chỗ `previewOptions` của `MarkdownEditor` để ghi rõ mục tiêu là đồng bộ image rendering giữa editor preview và custom preview.

Ví dụ comment ngắn phù hợp:

```ts
// `upload://` là URL giả để nối ảnh inline trong markdown với blob preview ở client.
```

```ts
// Chỉ cleanup blob URL khi unmount để tránh revoke nhầm ảnh vẫn đang được render.
```

---

## 12. Những điểm cần nhớ khi mở rộng sau này

### 12.1 Nếu backend trả asset URL ngay sau upload

Có thể nâng cấp flow sang:

- Upload ảnh trước.
- Nhận URL thật từ server.
- Ghi URL thật vào Markdown thay vì `upload://...`

Khi đó:

- Logic map `upload://` có thể đơn giản hơn hoặc bỏ hẳn.

### 12.2 Nếu cần drag and drop image vào editor

Cần mở rộng:

- Cơ chế bắt file drop.
- Tái sử dụng `appendAttachments()` và `handleInlineImageUpload()`.

### 12.3 Nếu cần hỗ trợ video inline trong Markdown

Cần bổ sung:

- custom renderer cho video
- quy ước syntax hoặc custom token
- UI preview riêng cho video

### 12.4 Nếu cần autosave draft

Cần cân nhắc:

- debounce state
- phân biệt draft local và draft server
- lưu attachment metadata thế nào khi reload page

---

## 13. Tóm tắt ngắn gọn

Flow tạo bài viết hiện tại được xây quanh `ArticleComposer`, với 2 chế độ viết là `standard` và `tech`.

Điểm kỹ thuật quan trọng nhất là:

- dùng Markdown string cho nội dung
- dùng `upload://` làm pseudo URL cho ảnh inline
- dùng `blob URL` để preview local
- đồng bộ custom image renderer ở cả:
  - `react-markdown`
  - `@uiw/react-md-editor`
- lọc attachment thật sự cần gửi ở bước submit

Đây là cách làm phù hợp khi frontend cần preview ảnh ngay trong lúc soạn bài nhưng chưa có asset URL thật từ backend.
