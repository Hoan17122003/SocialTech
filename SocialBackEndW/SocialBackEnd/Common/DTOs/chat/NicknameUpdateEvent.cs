namespace SocialBackEnd.Common.DTOs.Chat;

public sealed record NicknameUpdatedEvent(
    string ConversationKey,
    int UserId,
    string? NickName,
    string DisplayName,
    int UpdatedByUserId);