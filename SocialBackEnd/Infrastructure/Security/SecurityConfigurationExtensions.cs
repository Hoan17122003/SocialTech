using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Constants;

namespace SocialBackEnd.Infrastructure.Security;

public static class SecurityConfigurationExtensions
{
    // Đăng ký toàn bộ service liên quan đến security vào DI container.
    // Gồm:
    // - bind JwtOptions từ appsettings
    // - cấu hình JWT Bearer authentication
    // - cấu hình authorization policies
    public static IServiceCollection AddSecurityConfiguration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Bind section "Jwt" trong appsettings.json sang JwtOptions
        // để các service khác có thể inject bằng IOptions<JwtOptions>.
        services.Configure<JwtOptions>(
            configuration.GetSection(JwtOptions.SectionName));

        // Lấy giá trị cấu hình JWT ngay tại thời điểm startup để cấu hình middleware.
        var jwtOptions = configuration
            .GetSection(JwtOptions.SectionName)
            .Get<JwtOptions>() ?? throw new InvalidOperationException("Missing JWT configuration.");

        if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) || Encoding.UTF8.GetByteCount(jwtOptions.SecretKey) < 32)
        {
            throw new InvalidOperationException("JWT SecretKey must be at least 32 bytes for HS256.");
        }

        services
            // Đặt scheme mặc định là Bearer.
            // Khi endpoint yêu cầu [Authorize], framework sẽ dùng handler Bearer để authenticate.
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Yêu cầu metadata/token flow qua HTTPS trong môi trường chuẩn.
                options.RequireHttpsMetadata = true;

                // Không lưu raw token vào AuthenticationProperties.
                options.SaveToken = false;

                // Đây là tập rule để JwtBearerHandler dùng xác thực token
                // ở mỗi request có Authorization: Bearer <token>.
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    // Chỉ chấp nhận token do đúng issuer phát hành.
                    ValidateIssuer = true,

                    // Chỉ chấp nhận token dành cho đúng audience.
                    ValidateAudience = true,

                    // Token hết hạn sẽ bị từ chối.
                    ValidateLifetime = true,

                    // Chữ ký token phải khớp với secret key của hệ thống.
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                    // Chấp nhận lệch thời gian nhỏ giữa client và server.
                    ClockSkew = TimeSpan.FromSeconds(30)
                };

                // Các hook mở rộng quanh quá trình auth.
                // Hiện tại để trống, nhưng rất hữu ích khi cần log, kiểm tra tenant,
                // hoặc custom cách đọc token.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context => Task.CompletedTask,
                    OnTokenValidated = context =>
                    {
                        // resolve service ở runtime để tránh lỗi khởi động DI 
                        var cacheInternal = context.HttpContext.RequestServices.GetRequiredService<ICacheInternal>();

                        var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                        var authorizationHeader = context.HttpContext.Request.Headers.Authorization.ToString();
                        var jwt = String.Empty;
                        if (authorizationHeader.StartsWith($"{Constant.PrefixAuth} ", StringComparison.OrdinalIgnoreCase))
                        {
                            jwt = authorizationHeader[Constant.PrefixAuth.Length..].Trim();
                        }
                        // var email = context.Principal?.FindFirstValue(ClaimTypes.Email);
                        var tokenOfBlackList = cacheInternal.GetAsync<string>($"blacklist_token:{userId}@{jwt}").Result;
                        if (tokenOfBlackList != null)
                        {
                            context.Fail("Token is blacklisted.");
                            return Task.CompletedTask;
                        }
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context => Task.CompletedTask,
                    OnChallenge = context => Task.CompletedTask
                };
            });

        // Khai báo các policy authorization để dùng lại ở [Authorize(Policy = "...")].
        services.AddAuthorization(options =>
        {
            options.AddPolicy("CanWriteUsers", policy =>
                policy.RequireClaim("permission", "users.write"));
        });

        return services;
    }

    // Gắn security middleware vào request pipeline.
    // Thứ tự rất quan trọng:
    // - UseAuthentication(): đọc token, validate token, set HttpContext.User
    // - UseAuthorization(): đọc HttpContext.User để kiểm tra quyền truy cập endpoint
    public static IApplicationBuilder UseSecurityConfiguration(this IApplicationBuilder app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }
}
