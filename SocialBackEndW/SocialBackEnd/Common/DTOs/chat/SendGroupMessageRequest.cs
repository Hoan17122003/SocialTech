namespace SocialBackEnd.Common.DTOs.chat;

public sealed record SendGroupMessageRequest
{
    public string ConversationKey { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string? ClientMessageId { get; init; }
}
