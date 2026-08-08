using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Chat;

public interface IChatConversationSummaryBuilder
{
    Task<ChatConversationSummaryDto> BuildAsync(
        ChatConversation conversation,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<ChatConversationSummaryDto> BuildAsync(
        ConvertstationResultModel conversation,
        int currentUserId,
        CancellationToken cancellationToken = default);
}
