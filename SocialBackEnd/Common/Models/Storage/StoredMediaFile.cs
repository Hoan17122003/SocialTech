namespace SocialBackEnd.Common.Models.Storage;

public sealed record StoredMediaFile(
    string FilePath,
    string FileName,
    string FileExtension,
    long FileSize);
