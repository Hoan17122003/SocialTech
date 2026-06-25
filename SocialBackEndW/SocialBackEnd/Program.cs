using SocialBackEnd.DependencyInjection;
using SocialBackEnd.Infrastructure.Configuration;
using SocialBackEnd.Infrastructure.Security;
using SocialBackEnd.Presentation.Middlewares;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi.Models;
using Minio;
using SocialBackEnd.Infrastructure.Notifications.Internal;
using Microsoft.AspNetCore.RateLimiting;
using SocialBackEnd.Infrastructure.chat;
using SocialBackEnd.Infrastructure.Elasticsearch;

namespace SocialBackEnd;

public class Program
{
    public static void Main(string[] args)
    {
        // WebApplicationBuilder là điểm bắt đầu để cấu hình services, config và logging.
        var builder = WebApplication.CreateBuilder(args);

        // Nạp thêm biến môi trường từ file .env nếu dự án có dùng.
        builder.AddDotEnvFile();

        // Đăng ký các service nền tảng của ASP.NET Core và các dependency của dự án.
        builder.Services.AddControllers();
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("FrontendDev", policy =>
            {
                policy
                    .WithOrigins("http://localhost:3000", "https://localhost:3000")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            // Khai báo cơ chế Bearer token cho Swagger.
            // Sau khi cấu hình xong, Swagger UI sẽ hiện nút "Authorize".
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Nhập token theo định dạng: Bearer <your-jwt-token>"
            });

            // Áp dụng security scheme này cho các endpoint trong Swagger.
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });
        builder.Services.AddServiceDependencies(builder.Configuration);
        builder.Services.AddRepositoryDependencies(builder.Configuration);
        // cấu hình rate limit cho API, giới hạn số lượng request tối đa trong một khoảng thời gian nhất định.
        builder.Services.AddRateLimiter(options =>
        {
            options.AddFixedWindowLimiter("api",
                limiterOptions =>
                {
                    limiterOptions.PermitLimit = 100; // Số lượng request tối đa trong một window
                    limiterOptions.Window = TimeSpan.FromMinutes(1); // Thời gian của một window
                    limiterOptions.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst; // Xử lý request theo thứ tự đến
                    limiterOptions.QueueLimit = 0; // Không cho phép xếp hàng, trả về lỗi ngay khi vượt quá giới hạn
                }
            );
        });


        // Gom toàn bộ cấu hình authentication/authorization vào một extension
        // để Program.cs gọn hơn và phần security tập trung ở Infrastructure/Security.
        builder.Services.AddSecurityConfiguration(builder.Configuration);

        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = builder.Configuration.GetSection("RedisCacheSettings:Configuration").Value;
        });
        // Bật cấu hình elasticsearch connection
        builder.Services.AddElasticsearch(builder.Configuration);

        // Build tạo ra ứng dụng hoàn chỉnh từ toàn bộ cấu hình ở trên.
        var app = builder.Build();

        // tạo hub cho signalR
        app.MapHub<NotificationHub>("/notificationHub");
        app.MapHub<ChatHub>("/chatHub");

        // Middleware bắt lỗi toàn cục để chuẩn hóa response khi có exception.
        app.UseMiddleware<GlobalExceptionMiddleware>();

        // Chỉ bật Swagger ở môi trường development.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // Buộc request chuyển sang HTTPS nếu client gọi bằng HTTP.
        app.UseHttpsRedirection();

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(
                Path.Combine(app.Environment.ContentRootPath, "wwwroot")),
            RequestPath = string.Empty
        });

        // Chạy authentication trước rồi authorization sau.
        // Extension này thực chất gọi:
        // - app.UseAuthentication()
        // - app.UseAuthorization()
        app.UseCors("FrontendDev");
        app.UseSecurityConfiguration();

        // Map controller endpoints vào request pipeline.
        app.MapControllers();

        app.Run();
    }
}
