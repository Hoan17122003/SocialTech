using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.Models.c;
using SocialBackEnd.Common.Models.chat;
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

    public async Task<List<ConvertstationResultModel>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default)
    {
        var page = paganation.Page <= 0 ? 1 : paganation.Page;
        var limit = paganation.Limit <= 0 ? 10 : paganation.Limit;
        var DynamicTitle = string.Empty;

        var directIds = DbContext.ChatConversationParticipants
            .Where(x => x.UserId == userId && x.LeftAtUtc == null)
            .Select(x => x.ConversationId);

        var joinedCommunityIds = DbContext.CommunityMemberships
            .Where(x => x.UserId == userId && x.Status == CommunityMemberStatus.Active)
            .Select(x => x.CommunityId);
            
        var query = DbContext.ChatConversations
            .AsNoTracking()
            .Where(x =>
                (x.Kind == ChatConversationKind.Direct &&
                directIds.Contains(x.Id))
                ||
                (x.Kind == ChatConversationKind.Community &&
                x.CommunityId.HasValue &&
                joinedCommunityIds.Contains(x.CommunityId.Value)));

        return await query
            .OrderByDescending(x => x.LastMessageAtUtc)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new ConvertstationResultModel
            {
                ConverstationKey = x.ConversationKey,
                Kind = x.Kind,
                CommunityId = x.CommunityId,
                LastMessagePreview = x.LastMessagePreview,
                TargetUserId = x.Kind == ChatConversationKind.Direct ? 1 : -1,
                Title = DynamicTitle,
                LastMesssageAtUtc = x.LastMessageAtUtc
            })
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
