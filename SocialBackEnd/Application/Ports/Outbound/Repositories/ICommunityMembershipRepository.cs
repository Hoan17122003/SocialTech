using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface ICommunityMembershipRepository : IRepository<CommunityMembership>
{
    Task<CommunityMembership?> GetByCommunityAndUserAsync(
        Guid communityId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<List<CommunityMembership>> GetMembersByCommunityAsync(
        Guid communityId,
        CancellationToken cancellationToken = default);
}
