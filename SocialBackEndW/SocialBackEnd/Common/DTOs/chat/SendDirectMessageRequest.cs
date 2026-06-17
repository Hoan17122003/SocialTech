namespace SocialBackEnd.Common.DTOs.chat;

public sealed record SendDirectMessageRequest
{
    public int TargetUserId { get; init; }
    public string Content { get; init; } = string.Empty;
    public string? ClientMessageId { get; init; }
}
