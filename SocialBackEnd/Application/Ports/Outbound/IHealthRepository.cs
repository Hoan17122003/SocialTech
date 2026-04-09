using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound;

public interface IHealthRepository
{
    Task<SystemStatus> GetSystemStatusAsync(CancellationToken cancellationToken = default);
}
