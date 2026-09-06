namespace SocialBackEnd.Common.DTOs.chat;

public sealed record ChatConversationSummaryDto
{
    public string ConversationKey { get; init; } = string.Empty;
    public string ConversationType { get; init; } = string.Empty;
    public int? OtherUserId { get; init; }
    public int? CommunityId { get; init; }
    public string? Avatar { get; init; }
    public IReadOnlyList<int> ParticipantUserIds { get; init; } = Array.Empty<int>();
    public string? Title { get; init; }
    // Bổ sung NickName: Giữ lại biệt danh của đối phương khi broadcast SignalR chat.conversation.updated
    public string? NickName { get; init; }
    public string? LastMessagePreview { get; init; }
    public DateTimeOffset? LastMessageAtUtc { get; init; }
}
