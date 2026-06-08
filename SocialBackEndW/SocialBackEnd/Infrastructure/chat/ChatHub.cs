
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace SocialBackEnd.Infrastructure.chat;

public class ChatHub : Hub
{
    // Đây là hub SignalR để quản lý các kết nối chat và gửi tin nhắn thời gian thực đến client.
    // Các phương thức trong hub này có thể được gọi từ server để đẩy tin nhắn đến các client đã kết nối.
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // Lấy userId từ claim NameIdentifier

        if (userId == null)
        {
            // Nếu không có userId, ngắt kết nối
            Context.Abort();
            return;
        }

        Console.WriteLine($"User connected: {userId}, ConnectionId: {Context.ConnectionId}");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier; // Lấy userId từ claim NameIdentifier
        Console.WriteLine($"User disconnected: {userId}, ConnectionId: {Context.ConnectionId}");

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinPostGroup(string postId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"post:{postId}");
    }

    public async Task LeavePostGroup(string postId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"post:{postId}");
    }
}