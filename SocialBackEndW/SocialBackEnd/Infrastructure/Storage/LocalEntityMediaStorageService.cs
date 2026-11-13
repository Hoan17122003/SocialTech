using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.Constants;
using SocialBackEnd.Common.Models.Storage;

namespace SocialBackEnd.Infrastructure.Storage;

// Service nay luu va quan ly media tren local disk, cu the la thu muc wwwroot cua ASP.NET Core.
// Gia tri luu xuong DB nen la public path dang /uploads/..., khong phai absolute filesystem path.
public sealed class LocalEntityMediaStorageService : IEntityMediaLocalStorageService
{
    // Chi cho phep cac dinh dang anh an toan/pho bien cho avatar nguoi dung.
    private static readonly HashSet<string> AllowedUserImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    // Attachment cua bai viet hien cho phep anh va video mp4.
    private static readonly HashSet<string> AllowedPostAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".png",
        ".jpeg",
        ".mp4"
    };

    // IWebHostEnvironment dung de lay duong dan ContentRoot/WebRoot cua app.
    private readonly IWebHostEnvironment _environment;

    // IHttpContextAccessor dung de lay scheme/host cua request hien tai khi can build public URL.
    private readonly IHttpContextAccessor _httpContextAccessor;

    // IConfiguration dung de lay Application:PublicBaseUrl cho cac truong hop khong co request, vi du gui email.
    private readonly IConfiguration _configuration;

    public LocalEntityMediaStorageService(
        IWebHostEnvironment environment,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
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

        // Validate extension truoc khi ghi file de chan cac dinh dang khong mong muon.
        var extension = ValidateExtension(file, AllowedUserImageExtensions, "user profile image");

        // Avatar duoc gom theo user id de de quan ly va tranh trung ten giua cac user.
        var relativeDirectory = Path.Combine("uploads", "users", userId.ToString(), "profile");

        // Dung Guid lam ten file luu tru de tranh trung ten va khong phu thuoc ten file client gui len.
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var relativePath = await SaveFileAsync(file, relativeDirectory, fileName, cancellationToken);

        // Sau khi avatar moi da luu thanh cong, xoa avatar cu neu co.
        DeleteFileIfExists(currentFilePath);

        // Tra ve public path dang /uploads/... de luu DB va co the render lai thanh URL public.
        return relativePath;
    }

    public async Task<IReadOnlyList<StoredMediaFile>> SavePostAttachmentsAsync(
        int postId,
        IEnumerable<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        var storedFiles = new List<StoredMediaFile>();

        // Tat ca file dinh kem cua mot bai viet duoc luu trong folder rieng theo post id.
        var relativeDirectory = Path.Combine("posts", postId.ToString());

        // Bo qua file null hoac file rong de tranh ghi file khong hop le.
        foreach (var file in files.Where(x => x is not null && x.Length > 0))
        {
            var extension = ValidateExtension(file, AllowedPostAttachmentExtensions, "post attachment");
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var relativePath = await SaveFileAsync(file, relativeDirectory, storedFileName, cancellationToken);

            // StoredMediaFile gom thong tin can thiet de tao entity attachment va luu DB.
            storedFiles.Add(new StoredMediaFile(
                relativePath,
                Path.GetFileName(file.FileName),
                extension.TrimStart('.').ToLowerInvariant(),
                file.Length));
        }

        return storedFiles;
    }

    private async Task<string> SaveFileAsync(
        IFormFile file,
        string relativeDirectory,
        string fileName,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new ArgumentException("File khong hop le.", nameof(file));
        }

        // File vat ly se nam ben trong wwwroot de ASP.NET Core static file middleware phuc vu duoc.
        var webRootPath = ResolveWebRootPath();

        // Chuan hoa separator theo OS khi ghi file xuong disk.
        var normalizedRelativeDirectory = relativeDirectory.Replace('\\', Path.DirectorySeparatorChar);
        var absoluteDirectory = Path.Combine(webRootPath, normalizedRelativeDirectory);

        // Tao folder neu chua ton tai, vi upload co the la lan dau cua user/post.
        Directory.CreateDirectory(absoluteDirectory);

        var absolutePath = Path.Combine(absoluteDirectory, fileName);

        // FileShare.None tranh viec process khac doc/ghi cung luc trong khi file dang duoc upload.
        await using var stream = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, cancellationToken);

        // DB chi can luu public path; dau slash giup URL render ra dung dang /uploads/...
        var relativePath = Path.Combine(relativeDirectory, fileName).Replace('\\', '/');
        return $"/{relativePath}";
    }

    private string ResolveWebRootPath()
    {
        // Neu host da cau hinh WebRootPath thi dung truc tiep, thuong la thu muc wwwroot.
        if (!string.IsNullOrWhiteSpace(_environment.WebRootPath))
        {
            return _environment.WebRootPath;
        }

        // Fallback khi WebRootPath chua co: tao wwwroot trong ContentRootPath cua app.
        var webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        Directory.CreateDirectory(webRootPath);
        return webRootPath;
    }

    private static string ValidateExtension(IFormFile file, HashSet<string> allowedExtensions, string fileType)
    {
        // Chi validate theo extension cua ten file; neu can chat hon co the bo sung check content-type/signature.
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File {fileType} khong dung dinh dang cho phep.");
        }

        // Chuan hoa ve lowercase de metadata luu DB nhat quan.
        return extension.ToLowerInvariant();
    }

    private void DeleteFileIfExists(string? relativePath)
    {
        // Path rong/null nghia la khong co file cu de xoa.
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        // DB luu relative/public path, nen can resolve ve absolute filesystem path truoc khi xoa.
        var absolutePath = ResolveAbsolutePath(relativePath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }
    }

    public bool FileExists(string? filePath)
    {
        // Goi tu application service khi can biet attachment trong DB co con ton tai tren disk hay khong.
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return false;
        }

        return File.Exists(ResolveAbsolutePath(filePath));
    }

    private string ResolveAbsolutePath(string relativePath)
    {
        // Chuyen /uploads/a.jpg hoac uploads\a.jpg thanh path theo separator cua OS.
        var normalizedRelativePath = relativePath.TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);

        // Tat ca media local deu duoc resolve tu wwwroot.
        return Path.Combine(ResolveWebRootPath(), normalizedRelativePath);
    }

    public Task DeleteFilesAsync(
        IEnumerable<string> filePaths,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(filePaths);

        // Xoa tung file va ton trong cancellation token neu caller huy operation.
        foreach (var filePath in filePaths)
        {
            cancellationToken.ThrowIfCancellationRequested();
            DeleteFileIfExists(filePath);
        }

        return Task.CompletedTask;
    }

    public string GetAbsolutePathImageEcomsystem(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        // Email/browser chi hien thi duoc anh qua URL public http/https, khong dung duoc file path noi bo cua server.
        if (Uri.TryCreate(path, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return uri.ToString();
        }

        // Public base URL la domain ben ngoai co the truy cap app, vi du https://api.example.com.
        var publicBaseUrl = GetPublicBaseUrl();
        if (string.IsNullOrWhiteSpace(publicBaseUrl))
        {
            return string.Empty;
        }

        // Convert input ve public path duoi wwwroot, vi du /uploads/posts/1/a.jpg.
        var publicPath = GetPublicPath(path);
        if (string.IsNullOrWhiteSpace(publicPath))
        {
            return string.Empty;
        }

        // Ghep base URL voi public path de tao URL day du cho email/client.
        return $"{publicBaseUrl.TrimEnd('/')}/{publicPath.TrimStart('/')}";
    }

    public string GetAbsolutePathImageEcomsystemServer(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        var webRootPath = _environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            return string.Empty;
        }

        var relativePath = path.TrimStart('/', '\\');

        var absolutePath = Path.GetFullPath(
            Path.Combine(webRootPath, relativePath));

        var normalizedWebRoot = Path.GetFullPath(webRootPath)
            .TrimEnd(Path.DirectorySeparatorChar)
            + Path.DirectorySeparatorChar;

        // Không cho phép ../ thoát khỏi wwwroot
        if (!absolutePath.StartsWith(
                normalizedWebRoot,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The specified path is outside wwwroot.");
        }

        return absolutePath;
    }

    private string GetPublicBaseUrl()
    {
        // Khi gui email/background job thi thuong khong co HttpContext, nen uu tien base URL cau hinh san.
        var configuredBaseUrl = _configuration["Application:PublicBaseUrl"] ?? _configuration["PublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
        {
            return configuredBaseUrl;
        }

        // Fallback cho request truc tiep: lay scheme/host hien tai, vi du http://localhost:5019.
        var request = _httpContextAccessor.HttpContext?.Request;
        if (request is null || !request.Host.HasValue)
        {
            return string.Empty;
        }

        return $"{request.Scheme}://{request.Host.Value}";
    }

    private string GetPublicPath(string path)
    {
        var trimmedPath = path.Trim();

        // SaveFileAsync dang luu DB dang /uploads/..., day da la public path duoi wwwroot.
        if (trimmedPath.StartsWith('/') && !trimmedPath.StartsWith("//", StringComparison.Ordinal))
        {
            return trimmedPath;
        }

        if (Path.IsPathRooted(trimmedPath))
        {
            // Truong hop input la absolute filesystem path, vi du D:\...\wwwroot\uploads\a.jpg.
            var webRootPath = Path.GetFullPath(ResolveWebRootPath());
            var absolutePath = Path.GetFullPath(trimmedPath);

            // Chi cho phep convert file nam trong wwwroot thanh public URL.
            if (!absolutePath.StartsWith(webRootPath, StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            return Path.GetRelativePath(webRootPath, absolutePath).Replace('\\', '/');
        }

        // Truong hop input la relative path khong co slash dau, vi du uploads/posts/1/a.jpg.
        return trimmedPath.Replace('\\', '/');
    }
}
