using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommentVoteRepository : IRepository<CommentVote>
{
    Task<CommentVote?> GetByCommentAndUserAsync(
        Guid commentId,
        Guid userId,
        CancellationToken cancellationToken = default);
}
