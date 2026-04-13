using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommentRepository : IRepository<Comment>
{
    Task<List<Comment>> GetByPostAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<List<Comment>> GetRepliesAsync(Guid parentCommentId, CancellationToken cancellationToken = default);
}
