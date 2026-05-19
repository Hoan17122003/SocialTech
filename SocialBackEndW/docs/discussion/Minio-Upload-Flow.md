# Minio Upload Flow (SocialBackEnd)

Tài liệu này mô tả **luồng upload file lên Minio** trong project `SocialBackEnd` theo kiến trúc hiện tại (Ports/Adapters + DI + Options pattern).

Mục tiêu:

- Bạn hiểu file đi từ HTTP request → service → Minio như thế nào.
- Bạn hiểu từng thành phần được đăng ký trong DI (`ServiceDependencyInjection`) để làm gì.
- Bạn hiểu vì sao DB lưu `objectKey` thay vì URL.
- Bạn nắm được các class/args của Minio SDK được dùng trong code.
- Bạn có checklist best-practice & security khi triển khai production.

---

## 1. Big picture: file đi qua những lớp nào?

Luồng chuẩn khi client upload attachments cho bài viết:

1. Client gửi request tạo bài viết (kèm `IFormFile Attachments`).
2. `ArticleAdapterPort.CreateArticle(...)` tạo entity bài viết trước → lấy `postId`.
3. `ArticleAdapterPort` gọi `_entityMediaStorageService.SavePostAttachmentsAsync(postId, files)`.
4. `MinioEntityMediaStorageService`:
   - validate extension
   - generate `objectKey`
   - mở stream từ `IFormFile`
   - gọi `_minioFileStorage.UploadAsync(stream, objectKey, contentType)`
5. `MinioFileStorageAdapter` dùng `IMinioClient` (Minio SDK) để upload object lên bucket.
6. Service trả về danh sách `StoredMediaFile` (gồm `FilePath` = objectKey).
7. `ArticleAdapterPort` map `StoredMediaFile` → entity `Attachments` và lưu DB.

Điểm quan trọng: **Application layer không phụ thuộc Minio SDK**.

---

## 2. Quy ước dữ liệu lưu DB: vì sao lưu `objectKey`?

Trong entity `Attachments`, field `FilePath` hiện được dùng như “đường dẫn file”.

Khi dùng Minio:

- `FilePath` nên là **objectKey** (ví dụ: `uploads/posts/123/0f1a...c9.jpg`).
- Không lưu presigned URL vào DB (vì có expiry).
- Không nhất thiết lưu URL public cố định (vì có thể thay domain/CDN/proxy về sau).

Khi cần trả về URL cho client:

- Cách 1: build URL public theo endpoint/bucket/objectKey (chỉ phù hợp nếu bucket public).
- Cách 2 (khuyến nghị): server tạo presigned URL ngắn hạn hoặc proxy download qua API.

---

## 3. Cấu hình Minio: `MinioOptions`

Class: `SocialBackEnd.Infrastructure.Minio.MinioOptions`

Các thuộc tính chính:

- `Endpoint`: endpoint Minio/S3 (ví dụ `http://localhost:9000`)
- `AccessKey` / `SecretKey`: credential
- `BucketName`: bucket lưu object
- `UseSSL`: bật TLS khi endpoint là https
- `MinioLocation`: region/location khi tạo bucket (tùy Minio setup)

Nguồn config:

- `appsettings.json` / `appsettings.Development.json`
- `.env.prod` thông qua `AddDotEnvFile()` (in-memory overrides)

Lưu ý:

- Key bind phải đúng tên property: `Minio:Endpoint`, `Minio:BucketName`, ...

---

## 4. DI Registration: các service liên quan Minio được đăng ký thế nào?

File: `DependencyInjection/ServiceDependencyInjection.cs`

### 4.1. Bind options

`services.Configure<MinioOptions>(configuration.GetSection("Minio"));`

Ý nghĩa:

- Lấy section `Minio` từ `IConfiguration`.
- Bind sang object `MinioOptions`.
- Cho phép inject `IOptions<MinioOptions>` vào các lớp cần config.

### 4.2. Tạo `IMinioClient` singleton

`services.AddSingleton<IMinioClient>(sp => { ... return builder.Build(); });`

Ý nghĩa:

- `IMinioClient` là client SDK, thường **thread-safe** và nên tạo một lần.
- Lấy `MinioOptions` từ DI rồi cấu hình endpoint/credentials/SSL.

### 4.3. Adapter Minio (port implementation)

`services.AddScoped<IMinioFileStoragePort, MinioFileStorageAdapter>();`

Ý nghĩa:

- Application layer phụ thuộc interface `IMinioFileStoragePort`.
- Infrastructure cung cấp implementation `MinioFileStorageAdapter` dùng Minio SDK.

### 4.4. Media storage service (dùng Minio)

`services.AddScoped<IEntityMediaStorageService, MinioEntityMediaStorageService>();`

Ý nghĩa:

- `ArticleAdapterPort` không cần biết lưu local hay Minio.
- Chỉ cần gọi `IEntityMediaStorageService`.
- Việc “lưu vào đâu” được quyết định ở DI.

---

## 5. Code flow chi tiết: `CreateArticle` → Save attachments

File: `Application/Services/ArticleAdapterPort.cs`

Ở `CreateArticle(...)`:

- Tạo bài viết trước (để có `postId`).
- Nếu có attachments:
  - gọi `_entityMediaStorageService.SavePostAttachmentsAsync(articleId, files)`
  - nhận về `List<StoredMediaFile>`
  - map thành `List<Attachments>` và lưu DB qua repository

Vì `IEntityMediaStorageService` đã là Minio implementation, nên thực tế attachments được upload lên Minio.

---

## 6. `MinioEntityMediaStorageService`: nơi chuyển `IFormFile` thành upload Minio

File: `Infrastructure/Storage/MinioEntityMediaStorageService.cs`

### 6.1. `SavePostAttachmentsAsync(postId, files)`

Logic:

1. Lặp từng file `IFormFile` hợp lệ (`Length > 0`).
2. Validate extension theo whitelist (jpg/png/jpeg/mp4).
3. Generate tên file lưu trữ an toàn:
   - không dùng filename client
   - dùng `Guid` để tránh trùng
4. Build `objectKey` theo convention:

   - `uploads/posts/{postId}/{guid}.{ext}`

5. `file.OpenReadStream()` để lấy stream.
6. Gọi `_minioFileStorage.UploadAsync(stream, objectKey, file.ContentType)`.
7. Trả về `StoredMediaFile(objectKey, originalFileName, ext, fileSize)`.

### 6.2. `SaveUserProfileImageAsync(...)`

Tương tự attachments, nhưng objectKey theo prefix khác:

- `uploads/users/{userId}/profile/{guid}.{ext}`

Nếu có `currentFilePath` thì delete best-effort để dọn file cũ.

### 6.3. `DeleteFilesAsync(filePaths)`

- Xóa danh sách objectKey trong Minio.
- Thiết kế best-effort: không nên làm fail toàn bộ nghiệp vụ chỉ vì xóa thất bại.

### 6.4. `GetAbsolutePathImageEcomsystem(path)`

Mục tiêu:

- Convert từ `objectKey` sang URL client dùng được.

Trong implementation hiện tại:

- Nếu `path` đã là URL (http/https) → trả về luôn.
- Nếu là objectKey → build URL dạng: `{Endpoint}/{BucketName}/{objectKey}`.

Cảnh báo:

- Cách build URL này chỉ hoạt động khi bucket/object được public hoặc Minio được cấu hình policy phù hợp.
- Production nên dùng **presigned URL** hoặc **proxy API endpoint** để kiểm soát quyền truy cập.

---

## 7. `MinioFileStorageAdapter.UploadAsync`: Minio SDK chạy gì bên trong?

File: `Infrastructure/Minio/MinioFileStorageAdapter.cs`

Signature:

- `UploadAsync(Stream stream, string objectKey, string contentType, CancellationToken ct)`

Các bước:

1. Validate input (`stream`, `objectKey`, `bucketName`).
2. Kiểm tra bucket tồn tại:

- `BucketExistsArgs` + `BucketExistsAsync(...)`

3. Nếu bucket chưa tồn tại thì tạo bucket:

- `MakeBucketArgs` + `MakeBucketAsync(...)`

4. Đảm bảo stream có thể lấy size:

- Nếu stream **không seek** (`CanSeek == false`) thì buffer sang `MemoryStream`.

5. Tạo args upload object:

- `PutObjectArgs`
  - `.WithBucket(bucketName)`
  - `.WithObject(objectKey)`
  - `.WithStreamData(stream)`
  - `.WithObjectSize(size)`
  - `.WithContentType(contentType)`

6. Upload:

- `_minioClient.PutObjectAsync(putObjectArgs, ct)`

7. Return `objectKey` (để caller lưu DB).

### 7.1. Các class args của Minio SDK

Minio .NET SDK dùng pattern “Args” để build request:

- `BucketExistsArgs`: check bucket
- `MakeBucketArgs`: tạo bucket
- `PutObjectArgs`: upload
- `GetObjectArgs`: download (có callback stream)
- `RemoveObjectArgs`: delete
- `PresignedGetObjectArgs`: tạo presigned URL download
- `StatObjectArgs`: lấy metadata object (check exists)

Việc dùng args giúp code rõ ràng, immutable-ish, và tránh overload dài.

---

## 8. Best practices khi upload lên Minio

### 8.1. Không create bucket mỗi lần request

Hiện tại adapter check/create bucket trong mỗi upload.

- Dev: ok.
- Prod: nên “provision” bucket trước (infra), hoặc “ensure bucket” một lần lúc startup.

### 8.2. Không buffer file lớn vào RAM

Trong adapter hiện tại, nếu stream không seek được thì buffer vào `MemoryStream`.

- Với file lớn, điều này có thể gây memory spike.

Giải pháp tốt hơn:

- Lấy size từ `IFormFile.Length` ở lớp gọi (đã có) và sửa port để nhận size.
- Hoặc dùng multipart upload (tùy SDK support) / tách đường upload riêng.

### 8.3. Object key convention

- Không dùng filename user.
- Dùng prefix theo domain: `uploads/posts/...`, `uploads/users/...`.
- Dùng `Guid`.
- Normalize: chỉ dùng `/`, không dùng `..`, không dùng ký tự lạ.

### 8.4. ContentType

- Truyền `file.ContentType`.
- Nếu rỗng, fallback `application/octet-stream`.

### 8.5. CancellationToken

- Luôn truyền `CancellationToken` xuống Minio SDK.

---

## 9. Security (production)

### 9.1. Credentials

- Không hardcode access/secret key.
- Không log secrets.
- Rotate keys.

### 9.2. Bucket/object permissions

- Principle of least privilege.
- Bucket private mặc định.

### 9.3. Public URL vs Presigned URL

- Nếu bucket private: không nên build URL trực tiếp.
- Dùng presigned URL (expiry ngắn) hoặc proxy download endpoint.

### 9.4. Upload validation

- Whitelist extension.
- Giới hạn size.
- Không tin vào filename.
- Nếu cần: antivirus scan.

---

## 10. Gợi ý cải tiến tiếp theo (nếu muốn làm “chuẩn” hơn)

1. Sửa `IMinioFileStoragePort.UploadAsync` nhận thêm `long objectSize` để tránh buffer stream không-seek.
2. Thêm API `GetPresignedUrlAsync` cho attachments và trả về presigned URL cho client.
3. Thêm controller endpoint `/media/{*objectKey}` để proxy download + authorize.
4. Ensure bucket tại startup (hosted service) thay vì mỗi lần upload.

