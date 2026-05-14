using System;

namespace SocialBackEnd.Application.Ports.Outbound.Minio;

public interface IMinioFileStoragePort
{
    Task<string> UploadAsync(Stream stream,
        string objectKey,
        string contentType,
        CancellationToken cancellationToken = default
    );

    Task<Stream> DownloadAsync(
        string objectKey,
        CancellationToken cancellationToken = default
    );

    Task<bool> DeleteAsync(
        string objectKey,
        CancellationToken cancellationToken = default
    );

    Task<string> GetPresignedUrlAsync(
     string objectKey,
     int expiryInSeconds = 3600);

}
