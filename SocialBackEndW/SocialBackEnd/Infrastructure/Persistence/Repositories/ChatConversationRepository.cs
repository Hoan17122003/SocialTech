using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs;
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

    public async Task<(ChatConversation Conversation, bool Created)> GetOrCreateDirectConversationAsync(
        int firstUserId,
        int secondUserId,
        int createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetDirectConversationAsync(firstUserId, secondUserId, cancellationToken);
        if (existing is not null)
            return (existing, false);

        var conversation = ChatConversation.CreateDirect(firstUserId, secondUserId, createdByUserId);
        await DbSet.AddAsync(conversation, cancellationToken);

        try
        {
            await DbContext.SaveChangesAsync(cancellationToken);
            return (conversation, true);
        }
        catch (DbUpdateException)
        {
            // Request khác vừa tạo cặp này -> bỏ entity đang tracking, lấy bản đã commit
            DbContext.ChangeTracker.Clear();
            var winner = await GetDirectConversationAsync(firstUserId, secondUserId, cancellationToken);
            if (winner is null) throw;   // lỗi khác, không nuốt
            return (winner, false);
        }
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

    public Task<List<ConvertstationResultModel>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default)
    {
        var page = paganation.Page <= 0 ? 1 : paganation.Page;
        var limit = paganation.Limit <= 0 ? 10 : paganation.Limit;

        var participantIds = DbContext.ChatConversationParticipants
            .Where(x => x.UserId == userId && x.LeftAtUtc == null)
            .Select(x => x.ConversationId);

        var joinedCommunityIds = DbContext.CommunityMemberships
            .Where(x => x.UserId == userId && x.Status == CommunityMemberStatus.Active)
            .Select(x => x.CommunityId);

        return DbContext.ChatConversations
            .AsNoTracking()
            .Where(x =>
                (x.Kind == ChatConversationKind.Direct && participantIds.Contains(x.Id)) ||
                (x.Kind == ChatConversationKind.Group && participantIds.Contains(x.Id)) ||
                (x.Kind == ChatConversationKind.Community && x.CommunityId.HasValue && joinedCommunityIds.Contains(x.CommunityId.Value)))
            .Select(x => new
            {
                Conversation = x,
                TargetUserId = x.Kind == ChatConversationKind.Direct
                    ? (x.DirectUserLowId == userId ? x.DirectUserHighId : x.DirectUserLowId)
                    : (int?)null
            })
            // join thêm bảng Users để lấy PublicId
            .GroupJoin(DbContext.Users,
                conv => conv.TargetUserId,
                u => u.Id,
                (conv, users) => new { conv, users })
            .SelectMany(
                cu => cu.users.DefaultIfEmpty(),
                (cu, u) => new ConvertstationResultModel
                {
                    ConversationKey = cu.conv.Conversation.ConversationKey,
                    Kind = cu.conv.Conversation.Kind,
                    CommunityId = cu.conv.Conversation.CommunityId,
                    LastMessagePreview = cu.conv.Conversation.LastMessagePreview,
                    PublicTargetUserID = u != null ? u.PublicId : null, // thêm trường mới
                    Title = cu.conv.Conversation.Kind == ChatConversationKind.Direct
                        ? DbContext.ChatConversationParticipants
                            .Where(p => p.ConversationId == cu.conv.Conversation.Id && p.UserId != userId)
                            .Select(p => p.User.DisplayName)
                            .FirstOrDefault()
                        : cu.conv.Conversation.Title,
                    NickName = cu.conv.Conversation.Kind == ChatConversationKind.Direct
                        ? DbContext.ChatConversationParticipants
                            .Where(p => p.ConversationId == cu.conv.Conversation.Id && p.UserId != userId)
                            .Select(p => p.NickName)
                            .FirstOrDefault()
                        : null,
                    HasCustomTitle = cu.conv.Conversation.HasCustomTitle,
                    LastMessageAtUtc = cu.conv.Conversation.LastMessageAtUtc
                })
            .OrderByDescending(x => x.LastMessageAtUtc)
            .ThenByDescending(x => x.ConversationKey) // hoặc Id nếu cần
            .Skip((page - 1) * limit)
            .Take(limit)
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

        if (conversation.Kind is ChatConversationKind.Direct)
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
