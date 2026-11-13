
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Persistence;
using SocialBackEnd.Infrastructure.Persistence.Repositories;

public class OutBoxRepository : RepositoryBase<OutBoxMessage>, IOutBoxRepository
{

    public OutBoxRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<OutBoxMessage?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return DbContext
            .OutBoxMessages
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    // public async Task AddAsync(OutBoxMessage entity, CancellationToken cancellationToken = default)
    // {
    //     await _dbContext.OutBoxMessages.AddAsync(entity, cancellationToken);
    //     await _dbContext.SaveChangesAsync(cancellationToken);
    // }

    public async Task MarkAsProcessedAsync(int outBoxId)
    {
        var message = await DbContext.OutBoxMessages.FirstOrDefaultAsync(m => m.Id == outBoxId);
        if (message == null)
        {
            throw new InvalidOperationException("Message not found");
        }
        message.ProcessedOnUtc = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();
        return ;
    }
}