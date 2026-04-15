using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommunityRuleRepository : IRepository<CommunityRule>
{
    Task<List<CommunityRule>> GetActiveRulesByCommunityAsync(
        int communityId,
        CancellationToken cancellationToken = default);
}
