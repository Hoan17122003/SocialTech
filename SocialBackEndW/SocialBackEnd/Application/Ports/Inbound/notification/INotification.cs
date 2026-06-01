using SocialBackEnd.Common.DTOs.Notification;

namespace SocialBackEnd.Application.Ports.Inbound.notification;

public interface INotification
{
    Task SendNotificationAsync(string userId, string message, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<int>> MarkAsReadAsync(int userId, IReadOnlyCollection<int> notificationIds, CancellationToken cancellationToken = default);
}
