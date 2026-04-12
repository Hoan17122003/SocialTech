using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommunityRepository : IRepository<Community>
{
    Task<Community?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<List<Community>> GetVisibleCommunitiesAsync(CancellationToken cancellationToken = default);
}
