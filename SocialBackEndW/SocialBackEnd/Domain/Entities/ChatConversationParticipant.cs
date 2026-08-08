namespace SocialBackEnd.Domain.Entities;

public sealed class ChatConversationParticipant : EntityBase
{
    public int ConversationId { get; set; }
    public ChatConversation Conversation { get; set; } = null!;
    public int UserId { get; set; }
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAtUtc { get; set; }
    public DateTime? LastReadAtUtc { get; set; }
    public bool IsMuted { get; set; }
}
