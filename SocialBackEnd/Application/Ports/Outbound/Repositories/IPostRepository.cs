using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<List<Post>> GetPostsByCommunityAsync(Guid communityId, CancellationToken cancellationToken = default);
    Task<List<Post>> GetPostsByAuthorAsync(Guid authorId, CancellationToken cancellationToken = default);
}
