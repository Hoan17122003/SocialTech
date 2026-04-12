using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class PostVoteRepository : RepositoryBase<PostVote>, IPostVoteRepository
{
    public PostVoteRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<PostVote?> GetByPostAndUserAsync(
        Guid postId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.PostVotes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.PostId == postId && x.UserId == userId,
                cancellationToken);
    }
}
