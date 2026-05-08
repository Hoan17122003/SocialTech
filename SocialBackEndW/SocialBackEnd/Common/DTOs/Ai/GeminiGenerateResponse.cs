namespace SocialBackEnd.Common.DTOs.Ai;

public sealed record GeminiGenerateResponse
{
    public string Text { get; init; } = string.Empty;

    public string Model { get; init; } = string.Empty;

    public int AttemptCount { get; init; }
}
