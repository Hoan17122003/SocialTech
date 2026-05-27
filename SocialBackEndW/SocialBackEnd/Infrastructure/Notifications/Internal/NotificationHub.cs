using Microsoft.AspNetCore.SignalR;

namespace SocialBackEnd.Infrastructure.Notifications.Internal;

public class NotificationHub : Hub
{
    // Đây là hub SignalR để gửi thông báo thời gian thực đến client.
    // Các phương thức trong hub này có thể được gọi từ server để đẩy thông báo đến các client đã kết nối.
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;

        Console.WriteLine($"User connected: {userId}, ConnectionId: {Context.ConnectionId}");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"Disconnected: {Context.ConnectionId}");

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