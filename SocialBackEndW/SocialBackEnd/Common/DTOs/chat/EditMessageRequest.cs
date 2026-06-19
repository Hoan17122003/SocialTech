namespace SocialBackEnd.Common.DTOs.Chat;

public sealed record EditMessageRequest
{
    public string ConversationKey { get; init; } = null!;
    public int MessageId { get; init; }
    public string NewContent { get; init; } = null!;
}