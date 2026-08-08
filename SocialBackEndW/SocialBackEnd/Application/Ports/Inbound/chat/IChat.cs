using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.DTOs;

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

    Task<ChatConversationSummaryDto> CreateGroupAsync(int creatorUserId, CreateGroupConversationRequest request, CancellationToken cancellationToken = default);

    Task<ChatSendResult> SendGroupMessageAsync(int senderUserId, SendGroupMessageRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatConversationSummaryDto>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        int userId,
        string conversationKey,
        int take,
        DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatMessageDto>> SearchMessagesAsync(
        int userId, string conversationKey, string query, int take,
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
