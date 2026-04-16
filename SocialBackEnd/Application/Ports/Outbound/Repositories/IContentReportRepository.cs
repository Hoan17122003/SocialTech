using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IContentReportRepository : IRepository<ContentReport>
{
    Task<List<ContentReport>> GetPendingByCommunityAsync(
        int communityId,
        CancellationToken cancellationToken = default);
}
