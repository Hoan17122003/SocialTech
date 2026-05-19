using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel.Args;
using SocialBackEnd.Application.Ports.Outbound.Minio;

namespace SocialBackEnd.Presentation.Controllers;

[ApiController]
[Route("media")]
public sealed class MediaController : ControllerBase
{
    private readonly IMinioFileStoragePort _minioFileStorage;
    private readonly IMinioClient _minioClient;

    public MediaController(IMinioFileStoragePort minioFileStorage, IMinioClient minioClient)
    {
        _minioFileStorage = minioFileStorage ?? throw new ArgumentNullException(nameof(minioFileStorage));
        _minioClient = minioClient ?? throw new ArgumentNullException(nameof(minioClient));
    }

    // Download (attachment): browser se tai ve (Content-Disposition: attachment).
    [HttpGet("download/{**objectKey}")]
    public async Task<IActionResult> Download([FromRoute] string objectKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return BadRequest("Object key is required.");
        }

        // FE/clients đôi khi encode toàn bộ path bằng encodeURIComponent -> dấu '/' thành %2F.
        // Khi đó route catch-all sẽ nhận chuỗi chứa %2F, và nếu encode thêm lần nữa sẽ thành %252F.
        // Normalize về objectKey thật sự trước khi gọi Minio.
        objectKey = NormalizeObjectKey(objectKey);

        var contentType = await TryGetContentTypeAsync(objectKey, cancellationToken).ConfigureAwait(false)
            ?? "application/octet-stream";

        var stream = await _minioFileStorage.DownloadAsync(objectKey, cancellationToken);
        return File(stream, contentType, fileDownloadName: Path.GetFileName(objectKey));
    }

    // View (inline): FE co the dung truc tiep <img src="..."> / <video src="...">.
    // Catch-all route để nhận objectKey có chứa dấu `/` (ví dụ uploads/posts/1/a.jpg).
    [HttpGet("view/{**objectKey}")]
    public async Task<IActionResult> View([FromRoute] string objectKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return BadRequest("Object key is required.");
        }

        objectKey = NormalizeObjectKey(objectKey);

        var contentType = await TryGetContentTypeAsync(objectKey, cancellationToken).ConfigureAwait(false)
            ?? "application/octet-stream";

        var stream = await _minioFileStorage.DownloadAsync(objectKey, cancellationToken);
        Response.Headers.ContentDisposition = $"inline; filename=\"{Path.GetFileName(objectKey)}\"";
        return File(stream, contentType);
    }

    private static string NormalizeObjectKey(string objectKey)
    {
        var normalized = objectKey.Trim().TrimStart('/');

        // Unescape 1 lần để biến %2F -> '/' nếu client encode.
        normalized = Uri.UnescapeDataString(normalized);

        // Nếu còn sót do double-encode ở đâu đó, cố gắng unescape thêm 1 lần (idempotent với chuỗi thường).
        normalized = Uri.UnescapeDataString(normalized);

        return normalized.TrimStart('/');
    }

    private async Task<string?> TryGetContentTypeAsync(string objectKey, CancellationToken cancellationToken)
    {
        // Lay metadata de xac dinh content-type (anh/video) de browser render duoc.
        // Neu object khong ton tai thi de Minio throw o DownloadAsync.
        var bucketName = HttpContext.RequestServices
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<SocialBackEnd.Infrastructure.Minio.MinioOptions>>()
            .Value
            .BucketName;

        if (string.IsNullOrWhiteSpace(bucketName))
        {
            return null;
        }

        var statArgs = new StatObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey);

        var stat = await _minioClient.StatObjectAsync(statArgs, cancellationToken).ConfigureAwait(false);
        return stat?.ContentType;
    }
}
