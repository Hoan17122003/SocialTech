
using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Infrastructure.chat;

namespace SocialBackEnd.Application.Services;

public class ChatAdapter : IChatPort
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatAdapter(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
    }

    public Task SendMessageToGroup(string groupName, string message)
    {
        throw new NotImplementedException();
    }

    public Task SendMessageToUser(string userId, string message)
    {
        throw new NotImplementedException();
    }

    public Task JoinGroup(string groupName)
    {
        throw new NotImplementedException();
    }
    public Task LeaveGroup(string groupName)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyList<string>> GetUserGroups(string userId)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyList<string>> GetGroupMembers(string groupName)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyList<ChatMessageDto>> GetGroupMessages(string groupName, int count)
    {
        throw new NotImplementedException();
    }

    public Task<bool> RemoveMessage(int messageId)
    {
        throw new NotImplementedException();
    }

    public Task<MessageEditResult> EditMessage(int messageId, string newContent)
    {
        throw new NotImplementedException();
    }


}