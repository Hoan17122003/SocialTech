using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommunityRepository : RepositoryBase<Community>, ICommunityRepository
{
    public CommunityRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<Community?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        return DbContext.Communities
            .AsNoTracking()
            .Include(x => x.Rules)
            .FirstOrDefaultAsync(x => x.Slug == slug, cancellationToken);
    }

    public Task<List<Community>> GetVisibleCommunitiesAsync(CancellationToken cancellationToken = default)
    {
        return DbContext.Communities
            .AsNoTracking()
            .Where(x => x.Visibility != CommunityVisibility.Private)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }
}
