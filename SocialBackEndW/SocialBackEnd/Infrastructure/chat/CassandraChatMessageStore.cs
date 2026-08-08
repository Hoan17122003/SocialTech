using Cassandra;
using SocialBackEnd.Application.Ports.Outbound.Chat;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.chat;

public sealed class CassandraChatMessageStore : IChatMessageStore
{
    private readonly ICassandraSessionProvider _sessionProvider;

    public CassandraChatMessageStore(ICassandraSessionProvider sessionProvider)
    {
        _sessionProvider = sessionProvider ?? throw new ArgumentNullException(nameof(sessionProvider));
    }

    public async Task AppendAsync(ChatMessage message, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(message);

        var session = await _sessionProvider.GetSessionAsync(cancellationToken);
        var statement = new SimpleStatement(
            """
            INSERT INTO chat_messages_by_conversation
            (conversation_key, sent_at_utc, message_id, sender_user_id, content, client_message_id, reply_to_message_id, edited_at_utc, deleted_at_utc, state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            message.ConversationKey,
            message.SentAtUtc.UtcDateTime,
            message.MessageId,
            message.SenderUserId,
            message.Content,
            message.ClientMessageId,
            message.ReplyToMessageId,
            message.EditedAtUtc?.UtcDateTime,
            message.DeletedAtUtc?.UtcDateTime,
            message.State.ToString());

        await session.ExecuteAsync(statement).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<ChatMessage>> GetLatestAsync(
        string conversationKey,
        int take,
        DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default)
    {
        var session = await _sessionProvider.GetSessionAsync(cancellationToken);
        var safeTake = Math.Clamp(take, 1, 200);

        var statement = beforeUtc.HasValue
            ? new SimpleStatement(
                $"""
                SELECT conversation_key, sent_at_utc, message_id, sender_user_id, content, client_message_id, reply_to_message_id, edited_at_utc, deleted_at_utc, state
                FROM chat_messages_by_conversation
                WHERE conversation_key = ? AND sent_at_utc < ?
                LIMIT {safeTake}
                """,
                conversationKey,
                beforeUtc.Value.UtcDateTime)
            : new SimpleStatement(
                $"""
                SELECT conversation_key, sent_at_utc, message_id, sender_user_id, content, client_message_id, reply_to_message_id, edited_at_utc, deleted_at_utc, state
                FROM chat_messages_by_conversation
                WHERE conversation_key = ?
                LIMIT {safeTake}
                """,
                conversationKey);

        var rows = await session.ExecuteAsync(statement).ConfigureAwait(false);

        return rows.Select(MapMessage).ToList();
    }

    private static ChatMessage MapMessage(Row row)
    {
        var message = ChatMessage.Create(
            row.GetValue<string>("conversation_key"),
            row.GetValue<int>("sender_user_id"),
            row.GetValue<string>("content"),
            row.GetValue<string?>("client_message_id"),
            row.GetValue<Guid?>("reply_to_message_id"),
            new DateTimeOffset(DateTime.SpecifyKind(row.GetValue<DateTime>("sent_at_utc"), DateTimeKind.Utc)));

        var stateText = row.GetValue<string>("state");
        var state = Enum.TryParse<ChatMessageState>(stateText, true, out var parsedState)
            ? parsedState
            : ChatMessageState.Sent;

        if (state == ChatMessageState.Edited && !row.IsNull("edited_at_utc"))
        {
            message.Edit(
                row.GetValue<string>("content"),
                new DateTimeOffset(DateTime.SpecifyKind(row.GetValue<DateTime>("edited_at_utc"), DateTimeKind.Utc)));
        }

        if (state == ChatMessageState.Deleted && !row.IsNull("deleted_at_utc"))
        {
            message.SoftDelete(
                new DateTimeOffset(DateTime.SpecifyKind(row.GetValue<DateTime>("deleted_at_utc"), DateTimeKind.Utc)));
        }

        return message;
    }
}
