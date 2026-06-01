using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Application.Ports.Inbound.notification;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.Notification;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Notifications.Internal;

namespace SocialBackEnd.Application.Notifications;

public sealed class InAppNotificationService : INotification
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public InAppNotificationService(
        INotificationRepository notificationRepository,
        IHubContext<NotificationHub> hubContext)
    {
        _notificationRepository = notificationRepository ?? throw new ArgumentNullException(nameof(notificationRepository));
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
    }

    public async Task SendNotificationAsync(string userId, string message, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);

        if (!int.TryParse(userId, out var recipientUserId))
        {
            throw new ArgumentException("User id must be a valid integer.", nameof(userId));
        }

        var notification = new Notification
        {
            RecipientUserId = recipientUserId,
            Message = message.Trim()
        };

        await _notificationRepository.AddAsync(notification, cancellationToken);
        await _notificationRepository.SaveChangesAsync(cancellationToken);

        var payload = MapToDto(notification);
        await _hubContext.Clients
            .Group(NotificationHub.GetUserGroupName(userId))
            .SendAsync("notificationReceived", payload, cancellationToken);
    }

    public async Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(string userId, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);

        if (!int.TryParse(userId, out var recipientUserId))
        {
            throw new ArgumentException("User id must be a valid integer.", nameof(userId));
        }

        var notifications = await _notificationRepository.GetByRecipientUserIdAsync(recipientUserId, cancellationToken);
        return notifications.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<int>> MarkAsReadAsync(int userId, IReadOnlyCollection<int> notificationIds, CancellationToken cancellationToken = default)
    {
        if (userId <= 0)
        {
            throw new ArgumentException("User id must be a valid integer.", nameof(userId));
        }

        if (notificationIds.Count == 0)
        {
            return [];
        }

        var notifications = await _notificationRepository.GetByIdsForRecipientAsync(userId, notificationIds, cancellationToken);
        var unreadNotifications = notifications
            .Where(notification => !notification.IsRead)
            .ToList();

        if (unreadNotifications.Count == 0)
        {
            return [];
        }

        var readAtUtc = DateTime.UtcNow;
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = readAtUtc;
            _notificationRepository.Update(notification);
        }

        await _notificationRepository.SaveChangesAsync(cancellationToken);

        var readNotificationIds = unreadNotifications
            .Select(notification => notification.Id)
            .ToList();

        await _hubContext.Clients
            .Group(NotificationHub.GetUserGroupName(userId.ToString()))
            .SendAsync("notificationsRead", readNotificationIds, cancellationToken);

        return readNotificationIds;
    }

    private static NotificationDto MapToDto(Notification notification)
    {
        return new NotificationDto(
            notification.Id,
            notification.Message,
            notification.IsRead,
            notification.CreatedAtUtc,
            notification.ReadAtUtc);
    }
}
