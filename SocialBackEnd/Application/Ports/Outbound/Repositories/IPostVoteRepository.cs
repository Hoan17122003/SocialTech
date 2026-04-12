using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostVoteRepository : IRepository<PostVote>
{
    Task<PostVote?> GetByPostAndUserAsync(
        Guid postId,
        Guid userId,
        CancellationToken cancellationToken = default);
}
