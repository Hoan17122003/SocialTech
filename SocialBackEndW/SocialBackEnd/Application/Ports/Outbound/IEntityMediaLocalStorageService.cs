using SocialBackEnd.Common.Models.Storage;

namespace SocialBackEnd.Application.Ports.Outbound
{
    public interface IEntityMediaLocalStorageService
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

        Task DeleteFilesAsync(
            IEnumerable<string> filePaths,
            CancellationToken cancellationToken = default);

        bool FileExists(string? filePath);

        string GetAbsolutePathImageEcomsystem(string path);
        
        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <returns>return the path in wwwwroot on the server</returns>
        string GetAbsolutePathImageEcomsystemServer(string path);
    }
}
