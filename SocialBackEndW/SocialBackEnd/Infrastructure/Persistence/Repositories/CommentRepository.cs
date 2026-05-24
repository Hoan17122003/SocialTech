using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class CommentRepository : RepositoryBase<Comment>, ICommentRepository
{
    public CommentRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<Comment>> GetRepliesAsync(int parentCommentId, CancellationToken cancellationToken = default)
    {
        return DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Where(x => x.ParentCommentId == parentCommentId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<Comment?> GetCommentByIdAsync(int commentId, CancellationToken cancellationToken = default)
    {
        return DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Include(x => x.Attachments)
            .FirstOrDefaultAsync(x => x.Id == commentId, cancellationToken);
    }

    public async Task<Comment> CreateCommentOfArticleAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        DbContext.Comments.Add(comment);
        await DbContext.SaveChangesAsync(cancellationToken);

        return await DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Include(x => x.Attachments)
            .FirstAsync(x => x.Id == comment.Id, cancellationToken);
    }

    public async Task<Comment> UpdateCommentOfArticleAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        using var txs = await DbContext.Database.BeginTransactionAsync(cancellationToken);
        DbContext.Comments.Update(comment);
        await DbContext.SaveChangesAsync(cancellationToken);
        await txs.CommitAsync(cancellationToken);
        return await DbContext.Comments
           .AsNoTracking()
           .Include(x => x.Author)
           .Include(x => x.Attachments)
           .FirstAsync(x => x.Id == comment.Id, cancellationToken);
    }

    public Task<bool> DeleteCommentOfArticleAsync(int commentId, CancellationToken cancellationToken = default)
    {
        var comment = DbContext.Comments
            .Find(commentId);
        if (comment == null)
        {
            return Task.FromResult(false);
        }
        DbContext.Comments.Remove(comment);
        return Task.FromResult(DbContext.SaveChangesAsync(cancellationToken).Result > 0);
    }

    public Task<List<Comment>> GetCommentsOfArticleAsync(int articleId, Paganation paganation, CancellationToken cancellationToken = default)
    {
        var pageNumber = paganation.Page < 1 ? 1 : paganation.Page;
        var pageSize = paganation.Limit < 1 ? 10 : paganation.Limit;
        return DbContext.Comments
            .AsNoTracking()
            .Include(x => x.Author)
            .Include(x => x.Attachments)
            .Where(x => x.PostId == articleId && x.ParentCommentId == null)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }
}
