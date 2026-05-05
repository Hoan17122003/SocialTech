using System;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IAttachmentRepository : IRepository<Attachments>
{
    Task<int> AddAttachmentsAsync(List<Attachments> attachments, CancellationToken cancellationToken = default);
    Task<bool> DeleteAttachmentsByPostIdAsync(int postId, CancellationToken cancellationToken = default);
    Task<List<Attachments>> GetAttachmentsByPostIdAsync(int postId, CancellationToken cancellationToken = default);
    Task<bool> ExistsByPostIdAsync(int postId, CancellationToken cancellationToken = default);
}
