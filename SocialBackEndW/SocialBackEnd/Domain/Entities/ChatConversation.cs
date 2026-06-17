using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public sealed class ChatConversation : EntityBase
{
    public string ConversationKey { get; private set; } = string.Empty;
    public ChatConversationKind Kind { get; private set; }
    public int CreatedByUserId { get; private set; }
    public int? CommunityId { get; private set; }
    public int? DirectUserLowId { get; private set; }
    public int? DirectUserHighId { get; private set; }
    public string? Title { get; private set; }
    public string? LastMessagePreview { get; private set; }
    public int? LastMessageSenderUserId { get; private set; }
    public DateTime? LastMessageAtUtc { get; private set; }

    public ICollection<ChatConversationParticipant> Participants { get; private set; } =
        new List<ChatConversationParticipant>();

    private ChatConversation()
    {
    }

    public static ChatConversation CreateDirect(int firstUserId, int secondUserId, int createdByUserId)
    {
        if (firstUserId == secondUserId)
        {
            throw new ArgumentException("Direct chat requires two different users.", nameof(secondUserId));
        }

        var lowId = Math.Min(firstUserId, secondUserId);
        var highId = Math.Max(firstUserId, secondUserId);

        var conversation = new ChatConversation
        {
            ConversationKey = BuildDirectKey(lowId, highId),
            Kind = ChatConversationKind.Direct,
            CreatedByUserId = createdByUserId,
            DirectUserLowId = lowId,
            DirectUserHighId = highId
        };

        conversation.Participants.Add(new ChatConversationParticipant { UserId = lowId });
        conversation.Participants.Add(new ChatConversationParticipant { UserId = highId });

        return conversation;
    }

    public static ChatConversation CreateCommunity(int communityId, int createdByUserId, string? title)
    {
        if (communityId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(communityId));
        }

        return new ChatConversation
        {
            ConversationKey = BuildCommunityKey(communityId),
            Kind = ChatConversationKind.Community,
            CreatedByUserId = createdByUserId,
            CommunityId = communityId,
            Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim()
        };
    }

    public void TouchLastMessage(string preview, int senderUserId, DateTime utcNow)
    {
        LastMessagePreview = string.IsNullOrWhiteSpace(preview)
            ? string.Empty
            : preview.Trim();
        LastMessageSenderUserId = senderUserId;
        LastMessageAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        UpdatedAtUtc = LastMessageAtUtc;
    }

    public static string BuildDirectKey(int lowUserId, int highUserId)
        => $"dm:{lowUserId}:{highUserId}";

    public static string BuildCommunityKey(int communityId)
        => $"group:{communityId}";
}
