using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.Models.Storage;

namespace SocialBackEnd.Infrastructure.Storage;

public sealed class LocalEntityMediaStorageService : IEntityMediaStorageService
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
        ".jpeg",
        ".mp4"
    };

    private readonly IWebHostEnvironment _environment;

    public LocalEntityMediaStorageService(IWebHostEnvironment environment)
    {
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
    }

    public async Task<string> SaveUserProfileImageAsync(
        int userId,
        IFormFile file,
        string? currentFilePath = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        var extension = ValidateExtension(file, AllowedUserImageExtensions, "user profile image");
        var relativeDirectory = Path.Combine("uploads", "users", userId.ToString(), "profile");
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var relativePath = await SaveFileAsync(file, relativeDirectory, fileName, cancellationToken);

        DeleteFileIfExists(currentFilePath);

        return relativePath;
    }

    public async Task<IReadOnlyList<StoredMediaFile>> SavePostAttachmentsAsync(
        int postId,
        IEnumerable<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        var storedFiles = new List<StoredMediaFile>();
        var relativeDirectory = Path.Combine("uploads", "posts", postId.ToString());

        foreach (var file in files.Where(x => x is not null && x.Length > 0))
        {
            var extension = ValidateExtension(file, AllowedPostAttachmentExtensions, "post attachment");
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var relativePath = await SaveFileAsync(file, relativeDirectory, storedFileName, cancellationToken);

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

        var webRootPath = ResolveWebRootPath();
        var normalizedRelativeDirectory = relativeDirectory.Replace('\\', Path.DirectorySeparatorChar);
        var absoluteDirectory = Path.Combine(webRootPath, normalizedRelativeDirectory);

        Directory.CreateDirectory(absoluteDirectory);

        var absolutePath = Path.Combine(absoluteDirectory, fileName);
        await using var stream = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, cancellationToken);

        var relativePath = Path.Combine(relativeDirectory, fileName).Replace('\\', '/');
        return $"/{relativePath}";
    }

    private string ResolveWebRootPath()
    {
        if (!string.IsNullOrWhiteSpace(_environment.WebRootPath))
        {
            return _environment.WebRootPath;
        }

        var webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        Directory.CreateDirectory(webRootPath);
        return webRootPath;
    }

    private static string ValidateExtension(IFormFile file, HashSet<string> allowedExtensions, string fileType)
    {
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File {fileType} khong dung dinh dang cho phep.");
        }

        return extension.ToLowerInvariant();
    }

    private void DeleteFileIfExists(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        var normalizedRelativePath = relativePath.TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);

        var absolutePath = Path.Combine(ResolveWebRootPath(), normalizedRelativePath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }
    }
}
