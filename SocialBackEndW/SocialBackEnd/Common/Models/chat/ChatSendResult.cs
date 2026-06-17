using SocialBackEnd.Common.DTOs.chat;

namespace SocialBackEnd.Common.Models.chat;

public sealed record ChatSendResult
{
    public bool ConversationCreated { get; init; }
    public string ConversationKey { get; init; } = string.Empty;
    public ChatMessageDto Message { get; init; } = new();
}
