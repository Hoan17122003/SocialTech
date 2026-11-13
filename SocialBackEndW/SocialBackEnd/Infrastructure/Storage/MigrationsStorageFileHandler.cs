using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Domain.Entities;
using System.Text.Json;

namespace SocialBackEnd.Infrastructure.Storage
{
    public class MigrationsStorageFileHandler : IMigrationsStorageFileHandler
    {

        private readonly ILogger<MigrationsStorageFileHandler> _logger;
        private readonly IEntityMediaLocalStorageService _entityMediaLocalStorageService;
        private readonly IEntityMediaStorageService _entityMediaStorageServices;

        public MigrationsStorageFileHandler(ILogger<MigrationsStorageFileHandler> logger,
            IEntityMediaLocalStorageService entityMediaLocalStorageService,
            IEntityMediaStorageService entityMediaLocalStorageServices)
        {
            _logger = logger;
            _entityMediaLocalStorageService = entityMediaLocalStorageService;
            _entityMediaStorageServices = entityMediaLocalStorageServices;
        }

        public async Task HandlerAsync(string aggregateType, string eventType, DateTime processedOnUtc, string payload)
        {
            var json = payload;
            if (!string.IsNullOrWhiteSpace(json) &&
                json.TrimStart().StartsWith("\""))
            {
                json = JsonSerializer.Deserialize<string>(json)
                       ?? throw new JsonException(
                           "Payload contains an invalid JSON string.");
            }

            var convertPayloadToEntity =
                JsonSerializer.Deserialize<List<Attachments>>(json);

            if (convertPayloadToEntity is not null && convertPayloadToEntity.Count <= 0)
            {
                throw new ArgumentException("File path is required.", nameof(convertPayloadToEntity));
            }

            var formFiles = new List<IFormFile>();
            var postId = 0;
            foreach (var attachment in convertPayloadToEntity)
            {
                if (postId == 0)
                {
                    postId = attachment?.PostId ?? 0;
                }
                if (!_entityMediaLocalStorageService.FileExists(attachment.FilePath))
                {
                    throw new FileNotFoundException($"File không tồn tại: {attachment.FilePath}");
                }

                var absoluteLocalPath = _entityMediaLocalStorageService.GetAbsolutePathImageEcomsystemServer(attachment.FilePath);
                var fileStream = new FileStream(absoluteLocalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                var fileName = Path.GetFileName(attachment.FilePath);

                var formFile = new FormFile(fileStream, 0, fileStream.Length, "file", fileName)
                {
                    Headers = new HeaderDictionary(),
                    ContentType = GetContentType(fileName)
                };

                formFiles.Add(formFile);
            }
            _logger.LogInformation("event activate at : {}", DateTime.UtcNow);
            await _entityMediaStorageServices.SyncAttachmentData(postId, formFiles);
            return;
        }
        private static string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName)
                .ToLowerInvariant();

            return extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                ".svg" => "image/svg+xml",
                ".bmp" => "image/bmp",
                ".pdf" => "application/pdf",
                ".txt" => "text/plain",
                _ => "application/octet-stream"
            };
        }
    }

}
