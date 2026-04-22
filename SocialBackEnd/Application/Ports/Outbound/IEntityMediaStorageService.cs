using Microsoft.AspNetCore.Http;
using SocialBackEnd.Common.Models.Storage;

namespace SocialBackEnd.Application.Ports.Outbound;

public interface IEntityMediaStorageService
{
    Task<string> SaveUserProfileImageAsync(
        int userId,
        IFormFile file,
        string? currentFilePath = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StoredMediaFile>> SavePostAttachmentsAsync(
        int postId,
        IEnumerable<IFormFile> files,
        CancellationToken cancellationToken = default);
}
