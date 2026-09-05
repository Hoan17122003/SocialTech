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

        if (conversation.Kind == ChatConversationKind.Direct)
        {
            otherUserId = conversation.DirectUserLowId == currentUserId
                ? conversation.DirectUserHighId
                : conversation.DirectUserLowId;

            if (otherUserId.HasValue)
            {
                title = (await RequireUserAsync(otherUserId.Value, cancellationToken)).DisplayName;
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

        var title = conversation.Title;
        var participantIds = Array.Empty<int>();
        if (conversation.Kind == ChatConversationKind.Direct && conversation.TargetUserId.HasValue)
        {
            var other = await RequireUserAsync(conversation.TargetUserId.Value, cancellationToken);
            // title = other.DisplayName;
            participantIds = [currentUserId, other.Id];
        }
        else if (conversation.Kind == ChatConversationKind.Group)
        {
            var entity = await _chatConversationRepository.GetByConversationKeyAsync(conversation.ConversationKey, cancellationToken);
            participantIds = entity?.Participants.Where(x => x.LeftAtUtc == null).Select(x => x.UserId).ToArray() ?? [];
            // if (!conversation.HasCustomTitle)
            // {
            //     var names = new List<string>();
            //     foreach (var id in participantIds.Where(x => x != currentUserId).Take(3))
            //     {
            //         names.Add((await RequireUserAsync(id, cancellationToken)).DisplayName);
            //     }

            //     title = string.Join(", ", names);
            // }
        }

        return new ChatConversationSummaryDto
        {
            ConversationKey = conversation.ConversationKey,
            ConversationType = conversation.Kind.ToString().ToLowerInvariant(),
            OtherUserId = conversation.TargetUserId,
            CommunityId = conversation.CommunityId,
            ParticipantUserIds = participantIds,
            Title = title,
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
