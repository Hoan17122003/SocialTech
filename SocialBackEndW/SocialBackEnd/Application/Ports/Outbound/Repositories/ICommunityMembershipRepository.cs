using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommunityMembershipRepository : IRepository<CommunityMembership>
{
    Task<CommunityMembership?> GetByCommunityAndUserAsync(
        int communityId,
        int userId,
        CancellationToken cancellationToken = default);

    Task<List<CommunityMembership>> GetMembersByCommunityAsync(
        int communityId,
        CancellationToken cancellationToken = default);
}
