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
using Microsoft.Extensions.Options;
using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Application.Ports.Outbound.Events;
using SocialBackEnd.Infrastructure.cache;
using SocialBackEnd.Infrastructure.Kafka;
using StackExchange.Redis;
using Microsoft.AspNetCore.HttpOverrides;
using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Infrastructure.Gemini;
using SocialBackEnd.Application.Ports.Outbound.LLM;
using SocialBackEnd.Infrastructure.Minio;
using SocialBackEnd.Application.Ports.Outbound.Minio;
using Minio;

namespace SocialBackEnd.DependencyInjection;

public static class ServiceDependencyInjection
{
    public static IServiceCollection AddServiceDependencies(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.Configure<KafkaOptions>(configuration.GetSection(KafkaOptions.SectionName));
        services.Configure<GeminiOptions>(configuration.GetSection(GeminiOptions.SectionName));

        services.AddHttpClient<IEmailAccessTokenProvider, OAuth2AccessTokenProvider>();
        services.AddScoped<IUserPort, UserAdapaterPort>();
        services.AddScoped<IEmailPortOut, MailAdapter>();
        services.AddScoped<IEmailNotificationService, NotificationService>();
        services.AddSingleton<IApplicationEventPublisher, KafkaEventPublisher>();
        services.AddHostedService<KafkaEventConsumer>();
        // Nhúng param vào template renderer để gửi mail 
        services.AddScoped<IEmailTemplateRenderer<WelcomeEmailModel>, WellcomeEmailRenderer>();
        services.AddScoped<IEmailTemplateRenderer<ForgetPasswordEmailModel>, ForgetPasswordEmailRenderer>();
        services.AddScoped<IEmailTemplateRenderer<NotificationArticleCreate>, NotificationArticleCreateRenderer>();
        // Xử lý cho jwt & authentication 
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();
        services.AddScoped<IAuthenticationPort, AuthenticationAdapter>();
        // Nhúng LLM SDK vào hệ thống
        services.AddSingleton<IGeminiClientRouter, GeminiClientRouter>();
        services.AddScoped<IGeminiPort, GeminiAdapter>();
        services.AddScoped<IGeminiArticlePort, GeminiArticleAdapter>();

        services.AddScoped<IPasswordHashService, Argon2PasswordHashService>();
        services.AddScoped<IEntityMediaStorageService, MinioEntityMediaStorageService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IArticlePort, ArticleAdapterPort>();
        services.AddScoped<ICacheInternal, CacheAdapter>();
        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var redisConfiguration = configuration.GetSection("RedisCacheSettings:Configuration").Value;
            if (string.IsNullOrWhiteSpace(redisConfiguration))
            {
                throw new InvalidOperationException("Redis configuration is missing.");
            }
            return ConnectionMultiplexer.Connect(redisConfiguration);

        });
        services.Configure<MinioOptions>(configuration.GetSection(MinioOptions.SectionName));
        services.AddSingleton<IMinioClient>(sp =>
        {
            // DI sẽ gọi factory này đúng 1 lần để tạo instance `IMinioClient` (Singleton).
            // Tham số `sp` là `IServiceProvider`, dùng để resolve các dependency đã đăng ký trước đó.
            var minioOptions = sp.GetRequiredService<IOptions<MinioOptions>>().Value;

            if (string.IsNullOrWhiteSpace(minioOptions.Endpoint))
            {
                throw new InvalidOperationException("Minio:Endpoint is not configured.");
            }

            if (string.IsNullOrWhiteSpace(minioOptions.AccessKey) || string.IsNullOrWhiteSpace(minioOptions.SecretKey))
            {
                throw new InvalidOperationException(
                    "Minio credentials are missing. Configure Minio:AccessKey and Minio:SecretKey or matching environment variables such as MINIO_ACCESSKEY and MINIO_SECRETKEY.");
            }

            if (minioOptions.Endpoint.EndsWith(":9001", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Minio:Endpoint is pointing to port 9001, which is the MinIO console. Use the S3 API port instead, typically 9000.");
            }

            // Tạo Minio client theo builder pattern:
            // - `WithEndpoint(...)`: endpoint của Minio/S3 (ví dụ: http://localhost:9000 hoặc https://...)
            // - `WithCredentials(...)`: access key / secret key để authenticate
            var clientBuilder = new MinioClient()
                .WithEndpoint(minioOptions.Endpoint)
                .WithCredentials(minioOptions.AccessKey, minioOptions.SecretKey);

            // Nếu bật SSL (https) thì cấu hình client dùng TLS.
            if (minioOptions.UseSSL)
            {
                clientBuilder = clientBuilder.WithSSL();
            }

            // `Build()` trả về `IMinioClient` hoàn chỉnh và được DI giữ lại để inject cho các service khác.
            return clientBuilder.Build();
        });

        services.AddScoped<IMinioFileStoragePort, MinioFileStorageAdapter>();

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                     ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownNetworks.Clear(); // Xóa danh sách KnownNetworks mặc định để chấp nhận forwarded headers từ mọi IP.
            options.KnownProxies.Clear(); // Xóa danh sách KnownProxies mặc định để chấp nhận forwarded headers từ mọi IP.
        });

        return services;
    }
}
