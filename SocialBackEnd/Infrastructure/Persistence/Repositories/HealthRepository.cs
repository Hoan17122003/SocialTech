using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class HealthRepository : IHealthRepository
{
    private static readonly Guid DefaultStatusId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public HealthRepository(
        AppDbContext dbContext,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _environment = environment;
    }

    public async Task<SystemStatus> GetSystemStatusAsync(CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.SystemStatuses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == DefaultStatusId, cancellationToken);

        if (entity is null)
        {
            entity = new SystemStatus
            {
                Id = DefaultStatusId,
                Name = _configuration["Application:Name"] ?? "SocialBackEnd",
                Version = _configuration["Application:Version"] ?? "v1",
                Environment = _environment.EnvironmentName,
                UtcTime = DateTime.UtcNow
            };
        }
        else
        {
            entity.Environment = _environment.EnvironmentName;
            entity.UtcTime = DateTime.UtcNow;
        }

        return entity;
    }
}
