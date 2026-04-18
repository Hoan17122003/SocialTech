using SocialBackEnd.Application.Notifications;
using SocialBackEnd.Application.Notifications.Templates;
using SocialBackEnd.Application.Ports;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Services;
using SocialBackEnd.Common.DTOs.Mail;
using SocialBackEnd.Infrastructure.Notifications;

namespace SocialBackEnd.DependencyInjection;

public static class ServiceDependencyInjection
{
    public static IServiceCollection AddServiceDependencies(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));

        services.AddHttpClient<IEmailAccessTokenProvider, OAuth2AccessTokenProvider>();
        services.AddScoped<IUserPort, UserAdapaterPort>();
        services.AddScoped<IEmailPortOut, MailAdapter>();
        services.AddScoped<IEmailNotificationService, NotificationService>();
        services.AddScoped<IEmailTemplateRenderer<WelcomeEmailModel>, WellcomeEmailRenderer>();
        services.AddScoped<IAuthenticationPort, AuthenticationAdapterPort>();
        return services;
    }
}
