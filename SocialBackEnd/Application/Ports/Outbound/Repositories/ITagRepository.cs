using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ITagRepository : IRepository<Tag>
{
    Task<Tag?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
