using SocialBackEnd.Application.DTOs;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IHealthService
{
    Task<SystemStatusDto> GetSystemStatusAsync(CancellationToken cancellationToken = default);
}
