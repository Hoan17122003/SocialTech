using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Services;

namespace SocialBackEnd.DependencyInjection;

public static class ServiceDependencyInjection
{
    public static IServiceCollection AddServiceDependencies(this IServiceCollection services)
    {
        services.AddScoped<IHealthService, HealthService>();

        return services;
    }
}
