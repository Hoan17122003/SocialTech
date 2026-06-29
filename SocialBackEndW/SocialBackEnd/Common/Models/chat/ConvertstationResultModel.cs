
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Common.Models.chat;

public sealed record ConvertstationResultModel
{
    public string ConverstationKey { init; get; }
    public ChatConversationKind Kind { init; get; }
    public int? CommunityId { init; get; }
    public string LastMessagePreview { get; init; }
    public int? TargetUserId { get; init; }
    public string Title { get; set; }
    public DateTime? LastMesssageAtUtc { get; init; }
}