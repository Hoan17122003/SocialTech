using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Common.Events;
using SocialBackEnd.Common.Models.Article;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Application.Ports.Outbound.Minio;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<ArticleCreatedIntegrationEvent?> GetArticleCreatedEventAsync(int postId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetArticlesByCommunityAsync(int communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetArticlesByAuthorAsync(int authorId, CancellationToken cancellationToken = default);
    Task<bool> ExistsOfArticle(int userId, int articleId);
    Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdateArticleAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdateAndDeletArticleAsync(Post postToUpdate, Post postToDelete, CancellationToken cancellationToken = default);
    Task<Post?> GetDetailArticleById(int articleId, int userId, CancellationToken cancellationToken = default);
    public Task<List<Post>> GetArticlesAsync(Paganation paganation, CancellationToken cancellationToken = default);
}
