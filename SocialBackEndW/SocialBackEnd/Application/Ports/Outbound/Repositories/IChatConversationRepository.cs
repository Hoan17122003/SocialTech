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

    Task<IReadOnlyList<ChatConversation>> GetInboxAsync(
        int userId,
        CancellationToken cancellationToken = default);

    Task<bool> CanAccessAsync(
        string conversationKey,
        int userId,
        CancellationToken cancellationToken = default);
}
