using System;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Persistence;
using SocialBackEnd.Infrastructure.Persistence.Repositories;


public sealed class AttachmentRepository : RepositoryBase<Attachments>, IAttachmentRepository
{
    public AttachmentRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public async Task<int> AddAttachmentsAsync(List<Attachments> attachments, CancellationToken cancellationToken = default)
    {
        if (attachments == null || attachments.Count == 0)
        {
            throw new ArgumentException("Danh sách tệp đính kèm không được rỗng.", nameof(attachments));
        }

        await DbContext.AddRangeAsync(attachments, cancellationToken);
        await DbContext.SaveChangesAsync();
        return attachments.Count;
    }

    public async Task<bool> DeleteAttachmentsByPostIdAsync(int postId, CancellationToken cancellationToken = default)
    {
        var attachments = await DbContext.Attachments.Where(a => a.PostId == postId).ToListAsync();
        if (attachments == null || attachments.Count == 0)
        {
            return false; // Không tìm thấy tệp đính kèm nào cho bài viết này
        }

        DbContext.Attachments.RemoveRange(attachments);
        await DbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<Attachments>> GetAttachmentsByPostIdAsync(int postId, CancellationToken cancellationToken = default)
    {
        return await DbContext.Attachments
            .Where(a => a.PostId == postId)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsByPostIdAsync(int postId, CancellationToken cancellationToken = default)
    {
        return await DbContext.Attachments
            .AnyAsync(a => a.PostId == postId, cancellationToken);
    }
}
