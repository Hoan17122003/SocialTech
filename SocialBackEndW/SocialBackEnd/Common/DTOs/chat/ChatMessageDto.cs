
namespace SocialBackEnd.Common.DTOs.chat;

public record ChatMessageDto
{
    public string MessageId { get; init; } = string.Empty;
    public string ConversationKey { get; init; } = string.Empty;
    public string SenderId { get; init; } = string.Empty;
    public string SenderName { get; init; } = string.Empty;
    // Bổ sung SenderNickName: Chứa biệt danh của người gửi trong cuộc trò chuyện (nếu có)
    public string? SenderNickName { get; init; }
    public string Content { get; init; } = string.Empty;
    public DateTimeOffset SentAtUtc { get; init; }
    public bool IsEdited { get; init; }
    public bool IsDeleted { get; init; }
}
