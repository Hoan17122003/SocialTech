using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class ChatConversationRepository
    : RepositoryBase<ChatConversation>, IChatConversationRepository
{
    public ChatConversationRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<ChatConversation?> GetByConversationKeyAsync(
        string conversationKey,
        CancellationToken cancellationToken = default)
    {
        return DbContext.ChatConversations
            .Include(x => x.Participants)
            .FirstOrDefaultAsync(
                x => x.ConversationKey == conversationKey,
                cancellationToken);
    }

    public Task<ChatConversation?> GetDirectConversationAsync(
        int firstUserId,
        int secondUserId,
        CancellationToken cancellationToken = default)
    {
        var lowId = Math.Min(firstUserId, secondUserId);
        var highId = Math.Max(firstUserId, secondUserId);

        return DbContext.ChatConversations
            .Include(x => x.Participants)
            .FirstOrDefaultAsync(
                x => x.Kind == ChatConversationKind.Direct &&
                     x.DirectUserLowId == lowId &&
                     x.DirectUserHighId == highId,
                cancellationToken);
    }

    public Task<ChatConversation?> GetCommunityConversationAsync(
        int communityId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.ChatConversations
            .FirstOrDefaultAsync(
                x => x.Kind == ChatConversationKind.Community &&
                     x.CommunityId == communityId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<ChatConversation>> GetInboxAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        var directIds = DbContext.ChatConversationParticipants
            .Where(x => x.UserId == userId && x.LeftAtUtc == null)
            .Select(x => x.ConversationId);

        var joinedCommunityIds = DbContext.CommunityMemberships
            .Where(x => x.UserId == userId && x.Status == CommunityMemberStatus.Active)
            .Select(x => x.CommunityId);

        return await DbContext.ChatConversations
            .AsNoTracking()
            .Where(x =>
                (x.Kind == ChatConversationKind.Direct && directIds.Contains(x.Id)) ||
                (x.Kind == ChatConversationKind.Community &&
                 x.CommunityId.HasValue &&
                 joinedCommunityIds.Contains(x.CommunityId.Value)))
            .OrderByDescending(x => x.LastMessageAtUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> CanAccessAsync(
        string conversationKey,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await DbContext.ChatConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ConversationKey == conversationKey, cancellationToken);

        if (conversation is null)
        {
            return false;
        }

        if (conversation.Kind == ChatConversationKind.Direct)
        {
            return await DbContext.ChatConversationParticipants
                .AsNoTracking()
                .AnyAsync(
                    x => x.ConversationId == conversation.Id &&
                         x.UserId == userId &&
                         x.LeftAtUtc == null,
                    cancellationToken);
        }

        return conversation.CommunityId.HasValue &&
               await DbContext.CommunityMemberships
                   .AsNoTracking()
                   .AnyAsync(
                       x => x.CommunityId == conversation.CommunityId.Value &&
                            x.UserId == userId &&
                            x.Status == CommunityMemberStatus.Active,
                       cancellationToken);
    }
}
