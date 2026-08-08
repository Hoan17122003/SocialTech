namespace SocialBackEnd.Common.DTOs.chat;

public sealed record CreateGroupConversationRequest
{
    public IReadOnlyList<int> ParticipantUserIds { get; init; } = Array.Empty<int>();
    public string? Title { get; init; }
}
