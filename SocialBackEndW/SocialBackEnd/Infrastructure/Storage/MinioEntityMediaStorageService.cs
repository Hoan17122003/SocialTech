using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Minio;
using SocialBackEnd.Common.Models.Storage;
using SocialBackEnd.Infrastructure.Minio;

namespace SocialBackEnd.Infrastructure.Storage;

// Service nay luu va quan ly media tren Minio (S3-compatible).
// Gia tri luu xuong DB nen la objectKey (vi du: uploads/posts/1/abc.jpg), khong phai URL presigned.
public sealed class MinioEntityMediaStorageService : IEntityMediaStorageService
{
    private static readonly HashSet<string> AllowedUserImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private static readonly HashSet<string> AllowedPostAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".png",
        ".jpeg",
        ".mp4"
    };

    private readonly MinioOptions _options;
    private readonly IMinioFileStoragePort _minioFileStorage;
    private readonly IMinioClient _minioClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IConfiguration _configuration;

    public MinioEntityMediaStorageService(
        IOptions<MinioOptions> options,
        IMinioFileStoragePort minioFileStorage,
        IMinioClient minioClient,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _minioFileStorage = minioFileStorage ?? throw new ArgumentNullException(nameof(minioFileStorage));
        _minioClient = minioClient ?? throw new ArgumentNullException(nameof(minioClient));
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<string> SaveUserProfileImageAsync(
        int userId,
        IFormFile file,
        string? currentFilePath = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        var extension = ValidateExtension(file, AllowedUserImageExtensions, "user profile image");
        var objectKey = BuildObjectKey("/users", userId.ToString(), "profile", $"{Guid.NewGuid():N}{extension}");

        await using var stream = file.OpenReadStream();
        await _minioFileStorage.UploadAsync(stream, objectKey, file.ContentType, cancellationToken).ConfigureAwait(false);

        if (!string.IsNullOrWhiteSpace(currentFilePath))
        {
            await SafeDeleteAsync(currentFilePath, cancellationToken).ConfigureAwait(false);
        }

        return objectKey;
    }

    public async Task<IReadOnlyList<StoredMediaFile>> SavePostAttachmentsAsync(
        int postId,
        IEnumerable<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        var storedFiles = new List<StoredMediaFile>();

        foreach (var file in files.Where(x => x is not null && x.Length > 0))
        {
            var extension = ValidateExtension(file, AllowedPostAttachmentExtensions, "post attachment");
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var objectKey = BuildObjectKey("/posts", postId.ToString(), storedFileName);

            await using var stream = file.OpenReadStream();
            await _minioFileStorage.UploadAsync(stream, objectKey, file.ContentType, cancellationToken).ConfigureAwait(false);

            storedFiles.Add(new StoredMediaFile(
                objectKey,
                Path.GetFileName(file.FileName),
                extension.TrimStart('.').ToLowerInvariant(),
                file.Length));
        }

        return storedFiles;
    }

    public async Task DeleteFilesAsync(
        IEnumerable<string> filePaths,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(filePaths);

        foreach (var filePath in filePaths)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await SafeDeleteAsync(filePath, cancellationToken).ConfigureAwait(false);
        }
    }

    public bool FileExists(string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return false;
        }

        var bucketName = _options.BucketName;
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            return false;
        }

        try
        {
            var statArgs = new StatObjectArgs()
                .WithBucket(bucketName)
                .WithObject(filePath);

            _minioClient.StatObjectAsync(statArgs).GetAwaiter().GetResult();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public string GetAbsolutePathImageEcomsystem(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        // Neu da la URL thi tra ve luon.
        if (Uri.TryCreate(path, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return uri.ToString();
        }

        // Thay vi cho FE truy cap Minio truc tiep (de vuong CORS/policy/private bucket),
        // backend se cung cap endpoint proxy: GET /media/{objectKey} va stream ve.
        var publicBaseUrl = GetPublicBaseUrl();
        if (string.IsNullOrWhiteSpace(publicBaseUrl))
        {
            return string.Empty;
        }

        var encodedKey = EncodeObjectKeyForUrl(path);
        return $"{publicBaseUrl.TrimEnd('/')}/media/view/{encodedKey}";
    }

    private string GetPublicBaseUrl()
    {
        var configuredBaseUrl = _configuration["Application:PublicBaseUrl"] ?? _configuration["PublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
        {
            return configuredBaseUrl;
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        if (request is null || !request.Host.HasValue)
        {
            return string.Empty;
        }

        return $"{request.Scheme}://{request.Host.Value}";
    }

    private static string EncodeObjectKeyForUrl(string objectKey)
    {
        var trimmed = objectKey.Trim().TrimStart('/');
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return string.Empty;
        }

        // Encode theo từng segment để giữ lại '/' trong URL.
        return string.Join('/', trimmed
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Uri.EscapeDataString));
    }

    private static string ValidateExtension(IFormFile file, HashSet<string> allowedExtensions, string fileType)
    {
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            throw new ArgumentException($"File {fileType} khong co extension hop le.");
        }

        if (!allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File {fileType} khong dung dinh dang cho phep.");
        }

        return extension.ToLowerInvariant();
    }

    private static string BuildObjectKey(params string[] parts)
    {
        var sanitized = parts
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().Replace('\\', '/').Trim('/'));

        return string.Join('/', sanitized);
    }

    private async Task SafeDeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            return;
        }

        try
        {
            await _minioFileStorage.DeleteAsync(objectKey, cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            // Delete best-effort: khong throw de khong lam fail luong nghiep vu chinh.
        }
    }
}
