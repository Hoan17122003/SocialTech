using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class ContentReportRepository : RepositoryBase<ContentReport>, IContentReportRepository
{
    public ContentReportRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<ContentReport>> GetPendingByCommunityAsync(
        int communityId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.ContentReports
            .AsNoTracking()
            .Include(x => x.ReporterUser)
            .Include(x => x.AssignedModerator)
            .Where(x => x.CommunityId == communityId && x.Status == ReportStatus.Pending)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
