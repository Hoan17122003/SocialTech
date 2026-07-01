using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Search;

public interface IChatSearchIndex
{
    Task IndexAsync(ChatMessage message, string senderName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ChatMessage>> SearchAsync(string conversationKey, string query, int take, CancellationToken cancellationToken = default);
}
