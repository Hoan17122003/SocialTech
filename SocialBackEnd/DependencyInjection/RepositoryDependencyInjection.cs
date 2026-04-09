using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Infrastructure.Persistence;
using SocialBackEnd.Infrastructure.Persistence.Repositories;

namespace SocialBackEnd.DependencyInjection;

public static class RepositoryDependencyInjection
{
    public static IServiceCollection AddRepositoryDependencies(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));
    
        services.AddScoped<IHealthRepository, HealthRepository>();

        return services;
    }
}
