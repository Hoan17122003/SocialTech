using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public sealed class ChatConversation : EntityBase
{
    public Guid PublicId { get; private set; }
    public string ConversationKey { get; private set; } = string.Empty;
    public ChatConversationKind Kind { get; private set; }
    public int CreatedByUserId { get; private set; }
    public int? CommunityId { get; private set; }
    public int? DirectUserLowId { get; private set; }
    public int? DirectUserHighId { get; private set; }
    public string? Title { get; private set; }
    public bool HasCustomTitle { get; private set; }
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
            PublicId = Guid.NewGuid(),
            Kind = ChatConversationKind.Direct,
            CreatedByUserId = createdByUserId,
            DirectUserLowId = lowId,
            DirectUserHighId = highId
        };
        conversation.ConversationKey = BuildKey(conversation.PublicId);

        conversation.Participants.Add(new ChatConversationParticipant { UserId = lowId });
        conversation.Participants.Add(new ChatConversationParticipant { UserId = highId });

        return conversation;
    }

    public static ChatConversation CreateCommunity(int communityId, int createdByUserId, string title)
    {
        if (communityId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(communityId));
        }

        var conversation = new ChatConversation
        {
            PublicId = Guid.NewGuid(),
            Kind = ChatConversationKind.Community,
            CreatedByUserId = createdByUserId,
            CommunityId = communityId,
            Title = string.IsNullOrWhiteSpace(title) ? throw new ArgumentException("Community title is required.", nameof(title)) : title.Trim(),
            HasCustomTitle = true
        };
        conversation.ConversationKey = BuildKey(conversation.PublicId);
        return conversation;
    }

    public static ChatConversation CreateGroup(IEnumerable<int> userIds, int createdByUserId, string? title = null)
    {
        var participants = userIds.Append(createdByUserId).Distinct().ToArray();
        if (participants.Length < 3)
            throw new ArgumentException("Group chat requires at least three users.", nameof(userIds));

        var conversation = new ChatConversation
        {
            PublicId = Guid.NewGuid(),
            Kind = ChatConversationKind.Group,
            CreatedByUserId = createdByUserId,
            Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim(),
            HasCustomTitle = !string.IsNullOrWhiteSpace(title)
        };
        conversation.ConversationKey = BuildKey(conversation.PublicId);
        foreach (var userId in participants)
            conversation.Participants.Add(new ChatConversationParticipant { UserId = userId });
        return conversation;
    }

    public void Rename(string title)
    {
        if (Kind == ChatConversationKind.Direct)
            throw new InvalidOperationException("Direct conversations cannot be renamed.");
        Title = string.IsNullOrWhiteSpace(title) ? throw new ArgumentException("Title is required.", nameof(title)) : title.Trim();
        HasCustomTitle = true;
        UpdatedAtUtc = DateTime.UtcNow;
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

    public static string BuildKey(Guid publicId) => publicId.ToString("N");
}
