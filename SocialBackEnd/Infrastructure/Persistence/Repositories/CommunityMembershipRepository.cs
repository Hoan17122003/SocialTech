using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommunityMembershipRepository
    : RepositoryBase<CommunityMembership>, ICommunityMembershipRepository
{
    public CommunityMembershipRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<CommunityMembership?> GetByCommunityAndUserAsync(
        Guid communityId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.CommunityMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.CommunityId == communityId && x.UserId == userId,
                cancellationToken);
    }

    public Task<List<CommunityMembership>> GetMembersByCommunityAsync(
        Guid communityId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.CommunityMemberships
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.CommunityId == communityId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
