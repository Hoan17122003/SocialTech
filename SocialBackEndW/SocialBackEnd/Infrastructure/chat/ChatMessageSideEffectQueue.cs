using System.Threading.Channels;
using SocialBackEnd.Application.Ports.Outbound.Chat;

namespace SocialBackEnd.Infrastructure.chat;

public sealed class ChatMessageSideEffectQueue : IChatMessageSideEffectQueue
{
    private readonly Channel<ChatMessageSideEffectWorkItem> _channel = Channel.CreateUnbounded<ChatMessageSideEffectWorkItem>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

    public ValueTask EnqueueAsync(ChatMessageSideEffectWorkItem workItem, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(workItem);
        return _channel.Writer.WriteAsync(workItem, cancellationToken);
    }

    public IAsyncEnumerable<ChatMessageSideEffectWorkItem> ReadAllAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
