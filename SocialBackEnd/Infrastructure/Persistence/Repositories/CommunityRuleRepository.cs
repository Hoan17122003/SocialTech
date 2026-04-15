using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommunityRuleRepository : RepositoryBase<CommunityRule>, ICommunityRuleRepository
{
    public CommunityRuleRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<CommunityRule>> GetActiveRulesByCommunityAsync(
        int communityId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.CommunityRules
            .AsNoTracking()
            .Where(x => x.CommunityId == communityId && x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync(cancellationToken);
    }
}
