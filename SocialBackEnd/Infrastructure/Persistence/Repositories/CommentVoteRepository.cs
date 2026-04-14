using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommentVoteRepository : RepositoryBase<CommentVote>, ICommentVoteRepository
{
    public CommentVoteRepository(AppDbContext dbContext) : base(dbContext)
    {
    }


    public Task<CommentVote?> GetByCommentAndUserAsync(
        Guid commentId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return DbContext.CommentVotes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.CommentId == commentId && x.UserId == userId,
                cancellationToken);
    }
}
