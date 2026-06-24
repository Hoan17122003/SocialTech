using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public sealed class ChatMessage
{
    public Guid MessageId { get; init; } = Guid.NewGuid();
    public string ConversationKey { get; init; } = string.Empty;
    public int SenderUserId { get; init; }
    public string Content { get; private set; } = string.Empty;
    public string? ClientMessageId { get; init; }
    public Guid? ReplyToMessageId { get; init; }
    public ChatMessageState State { get; private set; } = ChatMessageState.Sent;
    public DateTimeOffset SentAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EditedAtUtc { get; private set; }
    public DateTimeOffset? DeletedAtUtc { get; private set; }

    private ChatMessage()
    {
    }

    public static ChatMessage Create(
        string conversationKey,
        int senderUserId,
        string content,
        string? clientMessageId = null,
        Guid? replyToMessageId = null,
        DateTimeOffset? sentAtUtc = null)
    {
        if (string.IsNullOrWhiteSpace(conversationKey))
        {
            throw new ArgumentException("Conversation key is required.", nameof(conversationKey));
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new ArgumentException("Message content is required.", nameof(content));
        }

        return new ChatMessage
        {
            ConversationKey = conversationKey.Trim(),
            SenderUserId = senderUserId,
            Content = content.Trim(),
            ClientMessageId = string.IsNullOrWhiteSpace(clientMessageId) ? null : clientMessageId.Trim(),
            ReplyToMessageId = replyToMessageId,
            SentAtUtc = sentAtUtc ?? DateTimeOffset.UtcNow
        };
    }

    public void Edit(string newContent, DateTimeOffset editedAtUtc)
    {
        if (string.IsNullOrWhiteSpace(newContent))
        {
            throw new ArgumentException("Message content is required.", nameof(newContent));
        }

        Content = newContent.Trim();
        EditedAtUtc = editedAtUtc;
        State = ChatMessageState.Edited;
    }

    public void SoftDelete(DateTimeOffset deletedAtUtc)
    {
        DeletedAtUtc = deletedAtUtc;
        State = ChatMessageState.Deleted;
        Content = string.Empty;
    }
}
