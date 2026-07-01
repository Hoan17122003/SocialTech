using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Chat;

public interface IChatMessageSideEffectQueue
{
    ValueTask EnqueueAsync(ChatMessageSideEffectWorkItem workItem, CancellationToken cancellationToken = default);
}
