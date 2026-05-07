using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class PostRepository : RepositoryBase<Post>, IPostRepository
{
    public PostRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<List<Post>> GetPostsByCommunityAsync(int communityId, CancellationToken cancellationToken = default)
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

    public Task<List<Post>> GetPostsByAuthorAsync(int authorId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Include(x => x.Community)
            .Where(x => x.AuthorId == authorId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> ExistsOfArticle(int userId, int articleId)
    {
        return DbContext.Posts
            .AnyAsync(x => x.AuthorId == userId && x.Id == articleId);
    }

    public async Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Add(post);
        await DbContext.SaveChangesAsync(cancellationToken);
        return post;
    }

    public async Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Remove(post);
        var affectedRows = await DbContext.SaveChangesAsync(cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> UpdatePostAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Update(post);
        var affectedRows = await DbContext.SaveChangesAsync(cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> UpdateAndDeletePostAsync(Post postToUpdate, Post postToDelete, CancellationToken cancellationToken = default)
    {
        using var transaction = await DbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            DbContext.Posts
                .Update(postToUpdate);
            var updateResult = await DbContext.SaveChangesAsync(cancellationToken);

            DbContext.Posts.Remove(postToDelete);
            var deleteResult = await DbContext.SaveChangesAsync(cancellationToken);

            if (updateResult > 0 && deleteResult > 0)
            {
                await transaction.CommitAsync(cancellationToken);
                return true;
            }

            await transaction.RollbackAsync(cancellationToken);
            return false;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public Task<Post> GetByArticleIdAsync(int articleId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .Include(x => x.Attachments)
            .Where(x => x.Id == articleId)
            .FirstOrDefaultAsync(cancellationToken);
    }


}
