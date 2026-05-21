using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using SocialBackEnd.Application.Ports.Outbound.Minio;

namespace SocialBackEnd.Infrastructure.Minio;

public sealed class MinioFileStorageAdapter : IMinioFileStoragePort
{

    private readonly MinioOptions _options;

    private readonly IMinioClient _minioClient;

    public MinioFileStorageAdapter(IOptions<MinioOptions> options,
        IMinioClient minioClient
    )
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _minioClient = minioClient ?? throw new ArgumentNullException(nameof(minioClient));
    }

    public async Task<string> UploadAsync(Stream stream, string objectKey, string contentType, CancellationToken cancellationToken = default)
    {
        if (stream is null)
        {
            throw new ArgumentNullException(nameof(stream));
        }

        if (string.IsNullOrWhiteSpace(objectKey))
        {
            throw new ArgumentException("Object key is required.", nameof(objectKey));
        }

        if (string.IsNullOrWhiteSpace(contentType))
        {
            contentType = "application/octet-stream";
        }

        var bucketName = _options.BucketName;
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            throw new InvalidOperationException("Minio bucket name is missing.");
        }

        var bucketExsitsArgs = new BucketExistsArgs()
            .WithBucket(bucketName);

        var found = await _minioClient.BucketExistsAsync(bucketExsitsArgs, cancellationToken)
            .ConfigureAwait(false);

        if (!found)
        {
            var makeBucketArgs = new MakeBucketArgs()
                .WithBucket(bucketName)
                .WithLocation(_options.MinioLocation);
            await _minioClient.MakeBucketAsync(makeBucketArgs, cancellationToken)
                .ConfigureAwait(false);
        }

        Stream uploadStream = stream;
        MemoryStream? bufferedStream = null;
        if (!uploadStream.CanSeek)
        {
            bufferedStream = new MemoryStream();
            await uploadStream.CopyToAsync(bufferedStream, cancellationToken).ConfigureAwait(false);
            bufferedStream.Position = 0;
            uploadStream = bufferedStream;
        }

        var objectSize = uploadStream.Length - uploadStream.Position;

        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucket: bucketName)
            .WithObject(objectKey)
            .WithStreamData(uploadStream)
            .WithObjectSize(objectSize)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putObjectArgs, cancellationToken).ConfigureAwait(false);

        bufferedStream?.Dispose();
        return objectKey;
    }

    public async Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            throw new ArgumentException("Object key is required.", nameof(objectKey));
        }

        var bucketName = _options.BucketName;
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            throw new InvalidOperationException("Minio bucket name is missing.");
        }

        var memoryStream = new MemoryStream();
        var getObjectArgs = new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithCallbackStream(stream => stream.CopyTo(memoryStream));

        await _minioClient.GetObjectAsync(getObjectArgs, cancellationToken).ConfigureAwait(false);
        memoryStream.Position = 0;
        return memoryStream;
    }

    public async Task<bool> DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            throw new ArgumentException("Object key is required.", nameof(objectKey));
        }

        var bucketName = _options.BucketName;
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            throw new InvalidOperationException("Minio bucket name is missing.");
        }

        var removeObjectArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey);

        await _minioClient.RemoveObjectAsync(removeObjectArgs, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<string> GetPresignedUrlAsync(string objectKey, int expiryInSeconds = 3600)
    {
        if (string.IsNullOrWhiteSpace(objectKey))
        {
            throw new ArgumentException("Object key is required.", nameof(objectKey));
        }

        var bucketName = _options.BucketName;
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            throw new InvalidOperationException("Minio bucket name is missing.");
        }

        if (expiryInSeconds <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(expiryInSeconds), "Expiry must be positive.");
        }

        var presignedArgs = new PresignedGetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithExpiry(expiryInSeconds);

        return await _minioClient.PresignedGetObjectAsync(presignedArgs).ConfigureAwait(false);
    }

    private async Task<string?> TryGetContentTypeAsync(string objectKey, CancellationToken cancellationToken)
    {
        // Lay metadata de xac dinh content-type (anh/video) de browser render duoc.
        // Neu object khong ton tai thi de Minio throw o DownloadAsync.
        var bucketName = _options.BucketName;

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
