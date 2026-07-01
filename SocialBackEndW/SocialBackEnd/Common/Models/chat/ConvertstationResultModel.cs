
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Common.Models.chat;

public sealed record ConvertstationResultModel
{
    public string ConversationKey { init; get; } = string.Empty;
    public ChatConversationKind Kind { init; get; }
    public int? CommunityId { init; get; }
    public string? LastMessagePreview { get; init; }
    public int? TargetUserId { get; init; }
    public string? Title { get; init; }
    public bool HasCustomTitle { get; init; }
    public DateTime? LastMessageAtUtc { get; init; }
}
