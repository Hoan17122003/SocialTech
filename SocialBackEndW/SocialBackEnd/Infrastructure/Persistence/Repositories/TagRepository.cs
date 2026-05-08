using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class TagRepository : RepositoryBase<Tag>, ITagRepository
{
    public TagRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<Tag?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        return DbContext.Tags
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == slug, cancellationToken);
    }
}
