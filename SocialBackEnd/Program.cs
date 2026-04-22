using SocialBackEnd.DependencyInjection;
using SocialBackEnd.Infrastructure.Configuration;
using SocialBackEnd.Infrastructure.Security;
using SocialBackEnd.Presentation.Middlewares;
using Microsoft.OpenApi.Models;

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
                Description = "Nhap token theo dinh dang: Bearer <your-jwt-token>"
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

        // Gom toàn bộ cấu hình authentication/authorization vào một extension
        // để Program.cs gọn hơn và phần security tập trung ở Infrastructure/Security.
        builder.Services.AddSecurityConfiguration(builder.Configuration);

        // Build tạo ra ứng dụng hoàn chỉnh từ toàn bộ cấu hình ở trên.
        var app = builder.Build();

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

        // Chạy authentication trước rồi authorization sau.
        // Extension này thực chất gọi:
        // - app.UseAuthentication()
        // - app.UseAuthorization()
        app.UseSecurityConfiguration();

        // Map controller endpoints vào request pipeline.
        app.MapControllers();

        app.Run();
    }
}
