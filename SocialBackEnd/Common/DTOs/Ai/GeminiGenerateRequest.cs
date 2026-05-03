namespace SocialBackEnd.Common.DTOs.Ai;

public sealed record GeminiGenerateRequest
{
    public string Prompt { get; init; } = string.Empty;

    public string? SystemInstruction { get; init; }

    public string? Model { get; init; }

    public float? Temperature { get; init; }

    public int? MaxOutputTokens { get; init; }
}
