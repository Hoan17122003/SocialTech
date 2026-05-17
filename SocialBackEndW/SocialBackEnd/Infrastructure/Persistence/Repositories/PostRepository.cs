using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.Constants;
using SocialBackEnd.Common.Events;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class PostRepository : RepositoryBase<Post>, IPostRepository
{
    public PostRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public async Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Add(post);
        await DbContext.SaveChangesAsync(cancellationToken);
        return post;
    }

    public Task<ArticleCreatedIntegrationEvent?> GetArticleCreatedEventAsync(int postId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Where(post => post.Id == postId)
            .Select(post => new ArticleCreatedIntegrationEvent
            {
                ArticleId = post.Id,
                AuthorId = post.AuthorId,
                NameAuthor = post.Author.DisplayName,
                AvatarAuthor = post.Author.ProfileImageUrl ?? string.Empty,
                Title = post.Title,
                CommunityId = post.CommunityId,
                LinkArticle = $"{Constant.PrefixArticle}/{post.Id}",
                LinkProfileAuthor = $"{Constant.PrefixAuthorLink}/{postId}",
                Thumbnail = post.Attachments
                    .OrderBy(attachment => attachment.Id)
                    .Select(attachment => attachment.FilePath)
                    .FirstOrDefault() ?? string.Empty,
                SubContent = string.Join(" ", post.Body.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(200)) ?? string.Empty,
                EmailUserFollow = post.Author.Followers
                    .Select(userFollow => userFollow.Follower.Email)
                    .ToList(),
                CreateDate = post.CreatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<List<Post>> GetArticlesByCommunityAsync(int communityId, CancellationToken cancellationToken = default)
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

    public Task<List<Post>> GetArticlesByAuthorAsync(int authorId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Include(x => x.Author)
            .Include(x => x.Community)
            .Include(x => x.Attachments)
            .Where(x => x.AuthorId == authorId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> ExistsOfArticle(int userId, int articleId)
    {
        return DbContext.Posts
            .AnyAsync(x => x.AuthorId == userId && x.Id == articleId);
    }

    public async Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Remove(post);
        var affectedRows = await DbContext.SaveChangesAsync(cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> UpdateArticleAsync(Post post, CancellationToken cancellationToken = default)
    {
        DbContext.Posts.Update(post);
        var affectedRows = await DbContext.SaveChangesAsync(cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> UpdateAndDeletArticleAsync(Post postToUpdate, Post postToDelete, CancellationToken cancellationToken = default)
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

    public Task<Post?> GetDetailArticleById(int articleId, CancellationToken cancellationToken = default)
    {
        return DbContext.Posts
            .AsNoTracking()
            .Include(post => post.Author)
            .Include(post => post.Attachments)
            .FirstOrDefaultAsync(post => post.Id == articleId, cancellationToken);
    }

}
