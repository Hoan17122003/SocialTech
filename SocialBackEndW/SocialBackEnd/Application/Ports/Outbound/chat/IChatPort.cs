
namespace SocialBackEnd.Application.Ports.Outbound.chat;

public interface IChatPort
{
    // Định nghĩa các phương thức cần thiết để tương tác với hệ thống chat.
    // Ví dụ, gửi tin nhắn, nhận tin nhắn, quản lý phòng chat, v.v.
    Task SendMessageAsync(string postId, string message, CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetMessagesAsync(string postId, CancellationToken cancellationToken = default);
    
}