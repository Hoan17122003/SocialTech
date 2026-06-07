using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Application.Ports.Inbound.notification;

namespace SocialBackEnd.Infrastructure.Notifications.Internal;

[Authorize]
public class NotificationHub : Hub
{
    private readonly INotification _notificationService;
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(INotification notificationService, ILogger<NotificationHub> logger)
    {
        _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        _logger.LogInformation("User {UserId} connected to notification hub with connection {ConnectionId}", userId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        }

        _logger.LogInformation("Connection {ConnectionId} disconnected from notification hub", Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    public Task<IReadOnlyList<Common.DTOs.Notification.NotificationDto>> GetMyNotifications()
    {
        var userId = GetRequiredUserId();
        return _notificationService.GetNotificationsAsync(userId, Context.ConnectionAborted);
    }

    public Task<IReadOnlyList<int>> MarkNotificationAsRead(List<int> notificationIds)
    {
        var userId = GetRequiredUserId();
        if (!int.TryParse(userId, out var userIdInt))
        {
            throw new HubException("Invalid user id.");
        }
        return _notificationService.MarkAsReadAsync(userIdInt, notificationIds, Context.ConnectionAborted);
    }

    public Task JoinPostGroup(int postId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, GetPostGroupName(postId));
    }

    public Task LeavePostGroup(int postId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, GetPostGroupName(postId));
    }

    public static string GetUserGroupName(string userId) => $"user:{userId}";

    public static string GetPostGroupName(int postId) => $"post:{postId}";

    private string GetRequiredUserId()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new HubException("Unauthorized connection.");
        }

        return userId;
    }

    private string? GetCurrentUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
    }
}
