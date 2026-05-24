using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommentRepository : IRepository<Comment>
{
    Task<List<Comment>> GetRepliesAsync(int parentCommentId, CancellationToken cancellationToken = default);
    Task<Comment?> GetCommentByIdAsync(int commentId, CancellationToken cancellationToken = default);
    Task<Comment> CreateCommentOfArticleAsync(Comment comment, CancellationToken cancellationToken = default);
    Task<Comment> UpdateCommentOfArticleAsync(Comment comment, CancellationToken cancellationToken = default);
    Task<bool> DeleteCommentOfArticleAsync(int commentId, CancellationToken cancellationToken = default);
    Task<List<Comment>> GetCommentsOfArticleAsync(int articleId, Paganation paganation, CancellationToken cancellationToken = default);
}