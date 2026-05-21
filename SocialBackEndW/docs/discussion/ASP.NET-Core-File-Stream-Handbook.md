# ASP.NET Core File/Stream Handbook

Tài liệu này tổng hợp cách xử lý **file, stream, ảnh/video, parallelism** trong ASP.NET Core (đặc biệt phù hợp cho dự án kiểu upload/download S3/Minio).

Mục tiêu:

- Hiểu sự khác nhau giữa `IFormFile`, `Stream`, `FileStreamResult`, buffering vs streaming.
- Biết cách implement endpoint upload/download đúng chuẩn (content-type, content-disposition, range, caching).
- Tránh lỗi phổ biến: memory spike, deadlock, double-encode objectKey, dispose stream sai, blocking sync IO.
- Nắm best practices cho xử lý song song (parallel) và giới hạn concurrency.

---

## 1. Khái niệm nền tảng

### 1.1. `IFormFile` là gì?

- `IFormFile` đại diện cho file gửi lên qua `multipart/form-data`.
- Thông tin chính:
  - `FileName`: tên file client gửi (không đáng tin để lưu trữ).
  - `ContentType`: MIME type do client khai báo (có thể sai).
  - `Length`: kích thước file (rất hữu ích để tránh buffer stream chỉ để lấy size).
  - `OpenReadStream()`: mở `Stream` để đọc nội dung.

**Best practice**:

- Không dùng trực tiếp `FileName` để đặt tên lưu trữ.
- Validate `Length` và extension/content-type.

### 1.2. `Stream` là gì?

- `Stream` là abstraction để đọc/ghi dữ liệu theo dòng.
- Một số `Stream` có `Length`/`Position` (seekable) như `FileStream`, `MemoryStream`.
- Một số stream **không seek** (không có `Length`) như network stream.

**Điểm quan trọng**: khi bạn cần `objectSize` cho S3/Minio mà stream không seek, bạn có 3 lựa chọn:

1. Lấy size từ metadata bên ngoài (vd `IFormFile.Length`).
2. Buffer vào RAM (`MemoryStream`) để có `Length` (nguy hiểm với file lớn).
3. Dùng upload API hỗ trợ multipart/chunk nếu SDK cung cấp.

### 1.3. Buffering vs Streaming

- **Buffering**: đọc toàn bộ file vào memory trước (dễ code, rủi ro memory spike).
- **Streaming**: đọc/ghi theo dòng, không giữ toàn bộ file trong RAM (khuyến nghị).

---

## 2. Upload file: patterns chuẩn

### 2.1. Upload vào local disk (wwwroot)

Luồng:

- Validate file.
- Tạo folder + tên file an toàn.
- `CopyToAsync` từ `IFormFile` xuống `FileStream`.
- Lưu DB path kiểu `/uploads/...`.

**Lưu ý**:

- Không lưu absolute path vào DB.
- Để `UseStaticFiles` serve file dưới `wwwroot`.

### 2.2. Upload lên S3/Minio

Luồng:

- Validate file.
- Generate `objectKey` (prefix + guid + ext).
- Mở stream từ `file.OpenReadStream()`.
- Gọi SDK upload (`PutObjectAsync` hoặc tương đương).
- Lưu DB `objectKey`.

**Best practices**:

- DB lưu objectKey, không lưu presigned URL.
- Cấu hình timeout + retry hợp lý.
- Không create bucket mỗi lần request ở production.

---

## 3. Download/Serve file: inline vs attachment

### 3.1. Inline (hiển thị ảnh/video trong browser)

Dùng khi FE render trực tiếp:

- `<img src="/media/view/...">`
- `<video src="/media/view/...">`

**Cần**:

- Trả đúng `Content-Type` (`image/jpeg`, `image/png`, `video/mp4`, ...).
- `Content-Disposition: inline; filename="..."`.

### 3.2. Attachment (tải về)

Dùng khi muốn browser download:

- `Content-Disposition: attachment; filename="..."`.

### 3.3. FileResult trong ASP.NET Core

Các kiểu hay dùng:

- `return File(stream, contentType)` → stream ra response.
- `return File(bytes, contentType)` → buffer bytes (không nên với file lớn).
- `return PhysicalFile(absolutePath, contentType)` → serve file local.

**Best practice**: với file lớn, ưu tiên stream.

---

## 4. Content-Type: tại sao quan trọng?

Nếu bạn trả `application/octet-stream`:

- Browser thường không render ảnh inline.
- `<img>` có thể không hiển thị.

Cách lấy content-type:

- Lưu content-type vào DB lúc upload.
- Hoặc query metadata từ storage (S3/Minio `StatObject`).
- Hoặc suy luận từ extension (kém tin cậy).

---

## 5. Xử lý ảnh (image) trong backend

### 5.1. Resize/thumbnail

Bạn có thể cần:

- Resize ảnh avatar.
- Tạo thumbnail cho bài viết.

Khuyến nghị:

- Làm ở background job (HostedService / queue) nếu nặng.
- Không resize trong request path nếu ảnh lớn hoặc traffic cao.

### 5.2. Strip metadata

- Ảnh có thể chứa EXIF (location, device).
- Nếu privacy quan trọng, cân nhắc strip EXIF.

### 5.3. Chống upload file giả dạng

- Client có thể gửi file `.jpg` nhưng thực chất là file khác.
- Nên kiểm tra magic bytes (signature) nếu yêu cầu bảo mật cao.

---

## 6. Parallelism & Concurrency trong xử lý file

### 6.1. `Task.WhenAll` khi upload nhiều file

Pattern:

- Map từng file → 1 task upload.
- `await Task.WhenAll(tasks)`.

Rủi ro:

- Upload song song quá nhiều → bão network/CPU/memory.

### 6.2. Giới hạn concurrency

Khuyến nghị:

- Dùng `SemaphoreSlim` để limit (vd 2–4 uploads song song).
- Hoặc dùng `Parallel.ForEachAsync` với `MaxDegreeOfParallelism`.

Ví dụ pseudo:

- `MaxDegreeOfParallelism = 4`.

### 6.3. Đừng dùng thread-blocking

Tránh:

- `.Result`, `.Wait()`
- `Task.Run` bừa bãi cho IO

Hãy dùng:

- async/await end-to-end.

---

## 7. CancellationToken: chuẩn hóa việc hủy request

- Mọi endpoint nên nhận `CancellationToken`.
- Truyền token xuống:
  - `CopyToAsync`
  - storage SDK calls
  - DB calls

Lợi ích:

- Client hủy request → backend dừng upload/download sớm.

---

## 8. Dispose stream: lỗi phổ biến

### 8.1. Không dispose stream mà caller quản lý

Nếu method nhận `Stream stream` từ nơi khác:

- **Không nên** `using var s = stream;` trừ khi contract nói rõ.

Pattern tốt:

- Caller mở stream (`await using var stream = file.OpenReadStream();`)
- Callee chỉ đọc, không dispose.

### 8.2. Nhưng phải dispose stream do mình tạo

Ví dụ:

- `new MemoryStream()`
- `new FileStream()`

---

## 9. Encoding path/objectKey trong URL

### 9.1. Vì sao có lỗi `%2F`/`%252F`?

- `encodeURIComponent("uploads/posts/1/a.jpg")` sẽ encode `/` thành `%2F`.
- Nếu encode lại lần nữa → `%252F`.

Khuyến nghị:

- Đừng encode cả path.
- Encode theo từng segment hoặc dùng `encodeURI`.

Backend:

- Có thể normalize bằng `Uri.UnescapeDataString` (cẩn thận double-encode).

---

## 10. Security checklist

- Validate extension + content-type.
- Limit size (server + reverse proxy).
- Không public bucket nếu không cần.
- Nếu private: dùng presigned URL ngắn hạn hoặc proxy endpoint + authorize.
- Không log secret, không log raw file content.
- Cân nhắc antivirus scan.

---

## 11. Gợi ý endpoint mẫu theo 2 chế độ

### 11.1. `GET /media/view/{objectKey}`

- inline
- đúng content-type
- stream trực tiếp

### 11.2. `GET /media/download/{objectKey}`

- attachment
- có filename

---

## 12. Debug checklist (khi FE không hiển thị)

1. URL trả về có đúng domain/port không?
2. `Content-Type` có phải `image/*` không?
3. Response có status 200 không? có bị 401/403 không?
4. ObjectKey có bị encode `%2F` không?
5. File có tồn tại trong bucket không?
6. Backend có stream được file không?

