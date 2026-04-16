using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostVoteRepository : IRepository<PostVote>
{
    Task<PostVote?> GetByPostAndUserAsync(
        int postId,
        int userId,
        CancellationToken cancellationToken = default);
}
