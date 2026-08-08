using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Chat;

public sealed record ChatMessageSideEffectWorkItem(
    ChatConversation Conversation,
    ChatMessage Message,
    string SenderName,
    bool IsNewConversation,
    int? DirectTargetUserId);
