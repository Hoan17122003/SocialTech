using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommentRepository : IRepository<Comment>
{
    Task<List<Comment>> GetByPostAsync(int postId, CancellationToken cancellationToken = default);
    Task<List<Comment>> GetRepliesAsync(int parentCommentId, CancellationToken cancellationToken = default);
}
