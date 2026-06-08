
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;

namespace SocialBackEnd.Application.Services;

public class ChatAdapterPortIn : IChatPort
{

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