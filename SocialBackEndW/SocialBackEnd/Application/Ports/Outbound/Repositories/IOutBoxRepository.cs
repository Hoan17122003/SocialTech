using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

public interface IOutBoxRepository : IRepository<OutBoxMessage>
{
    Task MarkAsProcessedAsync(int messageId);
}