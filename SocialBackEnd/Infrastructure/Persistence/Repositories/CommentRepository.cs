using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommentRepository : RepositoryBase<Comment>, ICommentRepository
{
    public CommentRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<Comment>> GetByPostAsync(Guid postId, CancellationToken cancellationToken = default)
    {
        return DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Where(x => x.PostId == postId && x.ParentCommentId == null)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Comment>> GetRepliesAsync(Guid parentCommentId, CancellationToken cancellationToken = default)
    {
        return DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Where(x => x.ParentCommentId == parentCommentId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
