using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommentVoteRepository : IRepository<CommentVote>
{
    Task<CommentVote?> GetByCommentAndUserAsync(
        int commentId,
        int userId,
        CancellationToken cancellationToken = default);
}
