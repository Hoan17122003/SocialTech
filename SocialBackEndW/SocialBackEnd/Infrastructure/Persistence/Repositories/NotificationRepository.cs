using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class NotificationRepository : RepositoryBase<Notification>, INotificationRepository
{
    public NotificationRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public async Task<IReadOnlyList<Notification>> GetByRecipientUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await DbContext.Notifications
            .AsNoTracking()
            .Where(notification => notification.RecipientUserId == userId)
            .OrderByDescending(notification => notification.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<Notification?> GetByIdForRecipientAsync(int notificationId, int userId, CancellationToken cancellationToken = default)
    {
        return DbContext.Notifications
            .FirstOrDefaultAsync(
                notification => notification.Id == notificationId && notification.RecipientUserId == userId,
                cancellationToken);
    }

    public Task<List<Notification>> GetByIdsForRecipientAsync(int userId, IReadOnlyCollection<int> notificationIds, CancellationToken cancellationToken = default)
    {
        return DbContext.Notifications
            .Where(notification => notification.RecipientUserId == userId &&
                    notificationIds.Contains(notification.Id))
            .ToListAsync(cancellationToken);
    }
}
