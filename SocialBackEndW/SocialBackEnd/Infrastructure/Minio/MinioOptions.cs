using System;

namespace SocialBackEnd.Infrastructure.Minio;

public class MinioOptions
{
    public const string SectionName = "Minio";
    public string Endpoint { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string BucketName { get; set; } = string.Empty;
    public bool UseSSL { get; set; }
    public string MinioLocation { set; get; } = string.Empty;
}
