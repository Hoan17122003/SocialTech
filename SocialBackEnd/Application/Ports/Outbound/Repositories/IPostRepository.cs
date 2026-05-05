using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByCommunityAsync(int communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByAuthorAsync(int authorId, CancellationToken cancellationToken = default);
    Task<bool> ExistsOfArticle(int userId, int articleId);
    Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<bool> UpdateAndDeletePostAsync(Post postToUpdate, Post postToDelete, CancellationToken cancellationToken = default);
}
