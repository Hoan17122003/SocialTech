using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Common.Events;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<ArticleCreatedIntegrationEvent?> GetArticleCreatedEventAsync(int postId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByCommunityAsync(int communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByAuthorAsync(int authorId, CancellationToken cancellationToken = default);
    Task<bool> ExistsOfArticle(int userId, int articleId);
    Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdateAndDeletePostAsync(Post postToUpdate, Post postToDelete, CancellationToken cancellationToken = default);
    Task<Post> GetDetailPostById(int articleId, CancellationToken cancellationToken = default);
}
