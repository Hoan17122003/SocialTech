using SocialBackEnd.Application.Ports.Outbound.Chat;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.chat;

public sealed class ChatConversationSummaryBuilder : IChatConversationSummaryBuilder
{
    private readonly IUserRepository _userRepository;
    private readonly IChatConversationRepository _chatConversationRepository;

    public ChatConversationSummaryBuilder(
        IUserRepository userRepository,
        IChatConversationRepository chatConversationRepository)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _chatConversationRepository = chatConversationRepository ?? throw new ArgumentNullException(nameof(chatConversationRepository));
    }

    public async Task<ChatConversationSummaryDto> BuildAsync(
        ChatConversation conversation,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(conversation);

        var title = conversation.Title;
        var participantIds = Array.Empty<int>();
        var otherUserId = default(int?);
        string? nickName = null;

        if (conversation.Kind == ChatConversationKind.Direct)
        {
            otherUserId = conversation.DirectUserLowId == currentUserId
                ? conversation.DirectUserHighId
                : conversation.DirectUserLowId;

            if (otherUserId.HasValue)
            {
                var otherUser = await RequireUserAsync(otherUserId.Value, cancellationToken);
                // Sửa: Tìm participant của đối phương trong cuộc hội thoại để lấy NickName (nếu đã đặt)
                var otherParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == otherUserId.Value);
                nickName = otherParticipant?.NickName;

                // Sửa: Nếu là Direct thì Title ưu tiên bằng NickName, nếu không có mới lấy DisplayName
                title = !string.IsNullOrWhiteSpace(nickName) ? nickName : otherUser.DisplayName;
                participantIds = [currentUserId, otherUserId.Value];
            }
        }
        else if (conversation.Kind == ChatConversationKind.Group)
        {
            participantIds = conversation.Participants
                .Where(x => x.LeftAtUtc == null)
                .Select(x => x.UserId)
                .Distinct()
                .ToArray();

            if (!conversation.HasCustomTitle)
            {
                var names = new List<string>();
                foreach (var id in participantIds.Where(x => x != currentUserId).Take(3))
                {
                    names.Add((await RequireUserAsync(id, cancellationToken)).DisplayName);
                }

                title = string.Join(", ", names);
            }
        }

        return new ChatConversationSummaryDto
        {
            ConversationKey = conversation.ConversationKey,
            ConversationType = conversation.Kind.ToString().ToLowerInvariant(),
            OtherUserId = otherUserId,
            CommunityId = conversation.CommunityId,
            ParticipantUserIds = participantIds,
            Title = title,
            // Sửa: Gán NickName để Frontend không bị mất biệt danh khi nhận event chat.conversation.updated
            NickName = nickName,
            // Avatar = conversation.Avatar,
            LastMessagePreview = conversation.LastMessagePreview,
            LastMessageAtUtc = conversation.LastMessageAtUtc.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(conversation.LastMessageAtUtc.Value, DateTimeKind.Utc))
                : null
        };
    }

    public async Task<ChatConversationSummaryDto> BuildAsync(
        ConvertstationResultModel conversation,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var nickName = conversation.NickName;
        var title = conversation.Title;
        var participantIds = Array.Empty<int>();
        if (conversation.Kind == ChatConversationKind.Direct && conversation.TargetUserId.HasValue)
        {
            var other = await RequireUserAsync(conversation.TargetUserId.Value, cancellationToken);
            // Sửa: Direct ưu tiên lấy Title theo NickName
            title = !string.IsNullOrWhiteSpace(nickName) ? nickName : (!string.IsNullOrWhiteSpace(conversation.Title) ? conversation.Title : other.DisplayName);
            participantIds = [currentUserId, other.Id];
        }
        else if (conversation.Kind == ChatConversationKind.Group)
        {
            var entity = await _chatConversationRepository.GetByConversationKeyAsync(conversation.ConversationKey, cancellationToken);
            participantIds = entity?.Participants.Where(x => x.LeftAtUtc == null).Select(x => x.UserId).ToArray() ?? [];
        }

        return new ChatConversationSummaryDto
        {
            ConversationKey = conversation.ConversationKey,
            ConversationType = conversation.Kind.ToString().ToLowerInvariant(),
            OtherUserId = conversation.TargetUserId,
            CommunityId = conversation.CommunityId,
            ParticipantUserIds = participantIds,
            Title = title,
            // Sửa: Gán NickName vào DTO
            NickName = nickName,
            LastMessagePreview = conversation.LastMessagePreview,
            LastMessageAtUtc = conversation.LastMessageAtUtc.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(conversation.LastMessageAtUtc.Value, DateTimeKind.Utc))
                : null
        };
    }

    private async Task<User> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException($"User {userId} khong ton tai.");
    }
}
