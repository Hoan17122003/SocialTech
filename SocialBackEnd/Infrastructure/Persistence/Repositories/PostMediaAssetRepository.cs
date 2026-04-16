using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class PostMediaAssetRepository : RepositoryBase<PostMediaAsset>, IPostMediaAssetRepository
{
    public PostMediaAssetRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<PostMediaAsset>> GetByPostAsync(int postId, CancellationToken cancellationToken = default)
    {
        return DbContext.PostMediaAssets
            .AsNoTracking()
            .Where(x => x.PostId == postId)
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync(cancellationToken);
    }
}
