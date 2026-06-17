namespace SocialBackEnd.Common.DTOs.chat;

public sealed record SendCommunityMessageRequest
{
    public int CommunityId { get; init; }
    public string Content { get; init; } = string.Empty;
    public string? ClientMessageId { get; init; }
}
