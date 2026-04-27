using SocialBackEnd.Application.Notifications;
using SocialBackEnd.Application.Notifications.Templates;
using SocialBackEnd.Application.Ports;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Application.Services;
using SocialBackEnd.Common.DTOs.Mail;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Notifications;
using SocialBackEnd.Infrastructure.Security;
using SocialBackEnd.Infrastructure.Storage;
using Microsoft.AspNetCore.Identity;

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
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();
        services.AddScoped<IPasswordHashService, Argon2PasswordHashService>();
        services.AddScoped<IEntityMediaStorageService, LocalEntityMediaStorageService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IArticlePort, ArticleAdapterPort>();

        return services;
    }
}