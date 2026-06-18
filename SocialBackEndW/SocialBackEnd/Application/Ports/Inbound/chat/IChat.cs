using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Application.Ports.Inbound.Chat;

public interface IChatPort
{
    Task<ChatSendResult> SendDirectMessageAsync(
        int senderUserId,
        SendDirectMessageRequest request,
        CancellationToken cancellationToken = default);

    Task<ChatSendResult> SendCommunityMessageAsync(
        int senderUserId,
        SendCommunityMessageRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatConversationSummaryDto>> GetInboxAsync(
        int userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        int userId,
        string conversationKey,
        int take,
        DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default);

    Task EnsureConversationAccessAsync(
        int userId,
        string conversationKey,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DetailUserFollow>> SearchCandidatesAsync(
        int userId,
        string query,
        CancellationToken cancellationToken = default);
}
