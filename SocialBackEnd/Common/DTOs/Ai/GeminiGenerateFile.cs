namespace SocialBackEnd.Common.DTOs.Ai;

public sealed record GeminiGenerateFile
{
    public string FileName { get; init; } = string.Empty;

    public string MimeType { get; init; } = string.Empty;

    public byte[] Data { get; init; } = [];
}
