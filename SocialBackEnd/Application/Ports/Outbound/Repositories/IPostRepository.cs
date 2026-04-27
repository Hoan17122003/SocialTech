using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<Post> CreatePostAsync(Post post, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByCommunityAsync(int communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByAuthorAsync(int authorId, CancellationToken cancellationToken = default);
    Task<bool> RemoveAsync(Post post, CancellationToken cancellationToken = default);
}
