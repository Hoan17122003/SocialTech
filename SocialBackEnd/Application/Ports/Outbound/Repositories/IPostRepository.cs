using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<List<Post>> GetPostsByCommunityAsync(int communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByAuthorAsync(int authorId, CancellationToken cancellationToken = default);
}
