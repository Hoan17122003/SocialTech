
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;

namespace SocialBackEnd.Application.Ports.Inbound.Chat
{
    public interface IChatPort
    {
        Task SendMessageToGroup(string groupName, string message);
        Task SendMessageToUser(string userId, string message);
        Task JoinGroup(string groupName);
        Task LeaveGroup(string groupName);
        Task<IReadOnlyList<string>> GetUserGroups(string userId);
        Task<IReadOnlyList<string>> GetGroupMembers(string groupName);
        Task<IReadOnlyList<ChatMessageDto>> GetGroupMessages(string groupName, int count);
        Task<bool> RemoveMessage(int messageId);
        Task<MessageEditResult> EditMessage(int messageId, string newContent);

    }
}