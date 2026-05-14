# MinIO Guide (S3) – SocialBackEnd

Tài liệu này mô tả cách dự án **SocialBackEnd** sử dụng (và nên sử dụng) MinIO như một S3-compatible object storage để lưu trữ file/media. Nội dung dựa trên code hiện tại trong repo: `SocialBackEnd/Application/Ports/Outbound/Minio/MinioFileStoragePort.cs` (các method của port) và `SocialBackEnd/Infrastructure/Minio/MinioOptions.cs`, kèm cấu hình Docker trong `SocialBackEnd/docker-compose.yml`.

> Lưu ý bảo mật: dự án hiện có các biến nhạy cảm trong `SocialBackEnd/.env.prod` (access key/secret key). Không copy secret thật vào tài liệu public và không commit secret lên git.

---

## 1. MinIO là gì và dùng để làm gì trong dự án?

MinIO là một **object storage** tương thích API của Amazon S3. Trong bối cảnh backend:

- Lưu trữ avatar, ảnh/video bài viết, file đính kèm… thay vì ghi xuống local disk.
- Tách storage khỏi server app → dễ scale, dễ backup/restore.
- Tạo **presigned URL** để client upload/download trực tiếp (giảm tải backend).
- Có thể áp dụng policy, lifecycle (tự xóa), versioning, encryption… giống hệ sinh thái S3.

Trong repo hiện tại, dự án đang có service lưu file local: `SocialBackEnd/Infrastructure/Storage/LocalEntityMediaStorageService.cs`. MinIO là hướng thay thế/triển khai production-friendly cho lưu trữ media.

---

## 2. Kiến trúc hiện tại trong code (Ports & Options)

### 2.1. Port (contract) để thao tác file trên MinIO

File: `SocialBackEnd/Application/Ports/Outbound/Minio/MinioFileStoragePort.cs`

```csharp
public interface IMinioFileStoragePort
{
    Task<string> UploadAsync(Stream stream, string objectKey, string contentType, CancellationToken cancellationToken = default);
    Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<string> GetPresignedUrlAsync(string objectKey, int expiryInSeconds = 3600);
}
```

Ý nghĩa:

- `UploadAsync`: upload nội dung stream lên MinIO theo `objectKey`. Trả về chuỗi định danh/đường dẫn (tùy implementation).
- `DownloadAsync`: tải object về dưới dạng `Stream`.
- `DeleteAsync`: xóa object.
- `GetPresignedUrlAsync`: tạo URL tạm thời (mặc định 3600s) để download (hoặc mở rộng cho upload) mà **không cần public bucket**.

> Ghi chú về code hiện tại: `SocialBackEnd/Application/Ports/Outbound/Minio/IMinioFileStoragePort.cs` đang tồn tại nhưng lại khai báo một interface tên `MinioFileStoragePort` và chưa có method. Nên chuẩn hóa lại tên file/interface để tránh nhầm lẫn (ví dụ chỉ giữ `IMinioFileStoragePort`).

### 2.2. Options (cấu hình) cho MinIO

File: `SocialBackEnd/Infrastructure/Minio/MinioOptions.cs`

```csharp
public class MinioOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string BucketName { get; set; } = string.Empty;
    public bool UseSSL { get; set; }
}
```

Các option này nên được bind từ `appsettings.*.json` hoặc environment variables.

---

## 3. Chạy MinIO bằng Docker Compose (dev/local)

File: `SocialBackEnd/docker-compose.yml` có service:

- S3 API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

MinIO được set root credentials bằng:

```yml
environment:
  MINIO_ROOT_USER: ${S3_ACCESS_KEY}
  MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
```

### 3.1. Cấu hình env (khuyến nghị dùng placeholder)

Trong `SocialBackEnd/.env.prod` đang có các biến dạng:

```env
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=uploads
S3_ACCESS_KEY=admin
S3_SECRET_KEY=***REDACTED***
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

Gợi ý mapping sang `MinioOptions`:

- `MinioOptions.Endpoint` ⇐ `S3_ENDPOINT`
- `MinioOptions.AccessKey` ⇐ `S3_ACCESS_KEY`
- `MinioOptions.SecretKey` ⇐ `S3_SECRET_KEY`
- `MinioOptions.BucketName` ⇐ `S3_BUCKET`
- `MinioOptions.UseSSL` ⇐ dựa trên endpoint `https://...` hoặc biến riêng `S3_USE_SSL`

> `S3_REGION` và `S3_FORCE_PATH_STYLE` chưa có trong `MinioOptions.cs`. Nếu bạn cần dùng (thường để tương thích AWS SDK), có thể mở rộng options hoặc chỉ dùng trong adapter.

### 3.2. Tạo bucket

Sau khi chạy compose, vào MinIO Console `http://localhost:9001`:

1. Login bằng `S3_ACCESS_KEY` / `S3_SECRET_KEY`
2. Tạo bucket tên đúng với `S3_BUCKET` (ví dụ `uploads`)

Khuyến nghị:

- Bucket **private** (mặc định).
- Không bật public access trừ khi bạn có CDN + policy rõ ràng.

---

## 4. Quy ước đặt `objectKey` (rất quan trọng)

Trong S3/MinIO, object được định danh bằng `objectKey` (giống path ảo). Quy ước tốt giúp:

- Tránh trùng tên file
- Dễ xóa theo nhóm
- Dễ phân quyền/policy theo prefix

Khuyến nghị pattern theo domain:

- Avatar người dùng: `users/{userId}/profile/{guid}.{ext}`
- Attachment bài viết: `posts/{postId}/{guid}.{ext}`
- Media theo entity bất kỳ: `{entityType}/{entityId}/{yyyy}/{MM}/{guid}.{ext}`

Gợi ý thêm:

- Không dùng tên file do client gửi (dễ có ký tự lạ, trùng, path traversal…).
- Luôn dùng `Guid` hoặc ULID.
- Lưu `objectKey` vào DB (hoặc một model chứa `objectKey`, `originalFileName`, `contentType`, `size`).

---

## 5. Hướng dẫn sử dụng các phương thức trong `IMinioFileStoragePort`

Phần này mô tả “cách dùng đúng” từ phía application/service/controller (caller). Adapter (implementation) sẽ nằm ở Infrastructure.

### 5.1. UploadAsync

Mục đích:

- Upload file từ backend lên MinIO.
- Trả về `objectKey` hoặc “public identifier” để lưu DB.

Lưu ý khi gọi:

- Luôn truyền đúng `contentType` (ví dụ `image/jpeg`, `video/mp4`).
- Nếu upload từ `IFormFile`, nên dùng `file.OpenReadStream()` và check `file.Length`.
- Nên set size và metadata (nếu adapter hỗ trợ).

Ví dụ flow (pseudo):

```csharp
var objectKey = $"users/{userId}/profile/{Guid.NewGuid():N}.jpg";
await minio.UploadAsync(fileStream, objectKey, "image/jpeg", cancellationToken);

// Lưu objectKey vào DB thay vì lưu absolute URL
user.ProfileImageObjectKey = objectKey;
```

### 5.2. DownloadAsync

Mục đích:

- Backend lấy stream object để trả ra response (khi bạn muốn proxy file qua backend).

Khuyến nghị:

- Với file lớn/video, tránh proxy qua backend nếu không cần; dùng **presigned URL** để client tải trực tiếp.

Ví dụ:

```csharp
using var stream = await minio.DownloadAsync(objectKey, cancellationToken);
return File(stream, contentType);
```

### 5.3. DeleteAsync

Mục đích:

- Xóa object khi user đổi avatar, xóa bài viết, xóa attachment…

Khuyến nghị:

- Xóa “best-effort”: nếu DB update thành công nhưng xóa object lỗi, có thể retry async bằng background job.
- Khi user replace avatar: upload mới trước, update DB, rồi mới xóa object cũ (giống pattern đang làm trong local storage).

### 5.4. GetPresignedUrlAsync

Mục đích:

- Tạo URL tạm thời để client tải file trực tiếp từ MinIO mà không public bucket.

Khuyến nghị:

- Expiry ngắn (5–60 phút).
- Đối với media hiển thị thường xuyên, cân nhắc:
  - Cache presigned URL ngắn hạn, hoặc
  - Public read + CDN (chỉ khi bạn chấp nhận public), hoặc
  - Proxy qua backend (tốn băng thông/CPU).

Ví dụ:

```csharp
var url = await minio.GetPresignedUrlAsync(objectKey, expiryInSeconds: 900);
return Ok(new { url });
```

---

## 6. Customize/Best practices khi tích hợp MinIO

### 6.1. Private bucket + presigned URL (khuyến nghị)

Ưu điểm:

- An toàn hơn mặc định public.
- Backend kiểm soát ai được lấy URL.

Nhược điểm:

- URL hết hạn; client cần refresh.

### 6.2. Content-Type và cache headers

Nên lưu đúng `Content-Type`. Nếu bạn phục vụ ảnh/video thường xuyên:

- Có thể set `Cache-Control` (ví dụ `public, max-age=31536000, immutable`) cho các object không đổi tên (hoặc object có tên theo hash).
- Nếu object có thể bị overwrite cùng key, tránh cache quá lâu (dễ cache stale).

### 6.3. Multipart upload (file lớn)

Nếu dự án có upload video/file lớn:

- Nên hỗ trợ multipart upload (MinIO/S3 đều hỗ trợ).
- Có thể triển khai flow presigned multipart upload để client upload trực tiếp.

### 6.4. Versioning & lifecycle

Tùy use case:

- Bật versioning nếu cần rollback.
- Lifecycle rule: tự xóa object rác sau N ngày (ví dụ upload dở dang, file tạm).

### 6.5. Bảo mật secrets

- Không hardcode access/secret key trong code.
- Dùng environment variables / secret manager.
- Rotate key định kỳ.

---

## 7. Hướng dẫn triển khai adapter (Infrastructure) theo chuẩn dự án

Hiện repo mới có **Port** và **Options** cho MinIO, chưa thấy adapter/DI wiring. Cách triển khai phù hợp theo pattern đang dùng (xem `DependencyInjection/ServiceDependencyInjection.cs`):

1. Tạo adapter ví dụ: `SocialBackEnd/Infrastructure/Minio/MinioFileStorageAdapter.cs`
2. Adapter implement `IMinioFileStoragePort` và dùng package `Minio` (đã có reference trong `SocialBackEnd/SocialBackEnd.csproj`).
3. Bind `MinioOptions` từ configuration.
4. Đăng ký DI trong `AddServiceDependencies`:
   - `services.Configure<MinioOptions>(configuration.GetSection("Minio"))` (hoặc section name bạn chọn)
   - `services.AddScoped<IMinioFileStoragePort, MinioFileStorageAdapter>()`

Gợi ý validate cấu hình khi startup (giống cách JWT/Redis đang làm):

- `Endpoint`, `AccessKey`, `SecretKey`, `BucketName` không được rỗng.
- Tự tạo bucket nếu chưa tồn tại (tùy ý; production thường tạo bằng IaC).

> Nếu bạn muốn, mình có thể implement đầy đủ adapter + đăng ký DI + ví dụ controller/service dùng `IMinioFileStoragePort` theo chuẩn hiện tại của repo.

---

## 8. Troubleshooting nhanh

### 8.1. Upload/Download lỗi kết nối

- Kiểm tra MinIO container đang chạy và port mapping `9000:9000`.
- Nếu backend chạy trong container cùng network compose, endpoint nên là `http://minio:9000` (không phải `localhost`).

### 8.2. AccessDenied / InvalidAccessKeyId

- Sai `S3_ACCESS_KEY` / `S3_SECRET_KEY`.
- Credential trong `.env.prod` không match với MinIO container.

### 8.3. NoSuchBucket

- Bucket `S3_BUCKET` chưa được tạo.
- Sai tên bucket (case-sensitive).

### 8.4. Presigned URL không truy cập được

- Expiry hết hạn.
- Endpoint/host trong URL không reachable từ client (ví dụ URL trỏ `minio:9000` nhưng client chạy ngoài docker).
- Nếu reverse proxy, cần cấu hình external URL/host phù hợp.
