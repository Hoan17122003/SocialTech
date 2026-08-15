using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface INotificationRepository : IRepository<Notification>
{
    Task<IReadOnlyList<Notification>> GetByRecipientUserIdAsync(int userId, CancellationToken cancellationToken = default);

    Task<Notification?> GetByIdForRecipientAsync(int notificationId, int userId, CancellationToken cancellationToken = default);
    Task<List<Notification>> GetByIdsForRecipientAsync(int userId, IReadOnlyCollection<int> notificationIds, CancellationToken cancellationToken = default);
    Task<int> MarkAsReadAsync(int userId, IReadOnlyCollection<int> notificationIds, CancellationToken cancellationToken = default);
    Task<int> SaveNotificationAsync(Notification notification, CancellationToken cancellationToken = default);

}
