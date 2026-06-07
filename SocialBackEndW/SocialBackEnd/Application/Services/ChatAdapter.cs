
using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Application.Ports.Outbound.chat;
using SocialBackEnd.Infrastructure.chat;

namespace SocialBackEnd.Application.Services;

public class ChatAdapter : IChatPort
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatAdapter(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
    }

    public Task SendMessageAsync(string roomId, string message, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<string>> GetMessagesAsync(string roomId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}