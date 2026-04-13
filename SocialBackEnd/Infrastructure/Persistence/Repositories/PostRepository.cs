using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class PostRepository : RepositoryBase<Post>, IPostRepository
{
    public PostRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<Post>> GetPostsByCommunityAsync(Guid communityId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Include(x => x.Author)
            .Include(x => x.PostTags)
                .ThenInclude(x => x.Tag)
            .Where(x => x.CommunityId == communityId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Post>> GetPostsByAuthorAsync(Guid authorId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Include(x => x.Community)
            .Where(x => x.AuthorId == authorId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
