using SocialBackEnd.Application.DTOs;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;

namespace SocialBackEnd.Application.Services;

public sealed class HealthService : IHealthService
{
    private readonly IHealthRepository _healthRepository;

    public HealthService(IHealthRepository healthRepository)
    {
        _healthRepository = healthRepository;
    }

    public async Task<SystemStatusDto> GetSystemStatusAsync(CancellationToken cancellationToken = default)
    {
        var status = await _healthRepository.GetSystemStatusAsync(cancellationToken);

        return new SystemStatusDto
        {
            Name = status.Name,
            Version = status.Version,
            Environment = status.Environment,
            UtcTime = status.UtcTime
        };
    }
}
