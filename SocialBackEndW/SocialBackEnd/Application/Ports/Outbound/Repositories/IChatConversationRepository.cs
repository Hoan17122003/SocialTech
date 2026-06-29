using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IChatConversationRepository : IRepository<ChatConversation>
{
    Task<ChatConversation?> GetByConversationKeyAsync(
        string conversationKey,
        CancellationToken cancellationToken = default);

    Task<ChatConversation?> GetDirectConversationAsync(
        int firstUserId,
        int secondUserId,
        CancellationToken cancellationToken = default);

    Task<ChatConversation?> GetCommunityConversationAsync(
        int communityId,
        CancellationToken cancellationToken = default);

    Task<List<ConvertstationResultModel>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default);

    Task<bool> CanAccessAsync(
        string conversationKey,
        int userId,
        CancellationToken cancellationToken = default);
}
