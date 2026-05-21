using System.Collections;

namespace SocialBackEnd.Infrastructure.Configuration;

public static class EnvFileConfigurationExtensions
{
    public static WebApplicationBuilder AddDotEnvFile(
        this WebApplicationBuilder builder,
        string fileName = ".env.prod")
    {
        var filePath = Path.Combine(builder.Environment.ContentRootPath, fileName);
        if (!File.Exists(filePath))
        {
            return builder;
        }

        foreach (var line in File.ReadAllLines(filePath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
            {
                continue;
            }

            var separatorIndex = trimmed.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = trimmed[..separatorIndex].Trim();
            var value = trimmed[(separatorIndex + 1)..].Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            Environment.SetEnvironmentVariable(key, value);
        }

        var minioEndpointRaw = GetEnvironmentVariable("Minio__Endpoint", "Minio_ENDPOINT");
        var (minioEndpoint, derivedUseSsl) = NormalizeEndpoint(minioEndpointRaw);
        var minioUseSslRaw = GetEnvironmentVariable("Minio__UseSSL", "Minio_USE_SSL");
        if (string.IsNullOrWhiteSpace(minioUseSslRaw) && derivedUseSsl is not null)
        {
            minioUseSslRaw = derivedUseSsl.Value ? "true" : "false";
        }

        var overrides = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["Smtp:FromEmail"] = GetEnvironmentVariable("Smtp__FromEmail", "ADMIN_EMAIL_ADDRESS"),
            ["Smtp:OAuth2:ClientId"] = GetEnvironmentVariable("Smtp__OAuth2__ClientId", "MAILER_CLIENT_ID"),
            ["Smtp:OAuth2:ClientSecret"] = GetEnvironmentVariable("Smtp__OAuth2__ClientSecret", "MAILER_CLIENT_SECRET"),
            ["Smtp:OAuth2:RefreshToken"] = GetEnvironmentVariable("Smtp__OAuth2__RefreshToken", "MAIL_REFRESH"),
            ["Smtp:OAuth2:TokenEndpoint"] = GetEnvironmentVariable("Smtp__OAuth2__TokenEndpoint", "MAIL_TOKEN_ENDPOINT"),
            ["Smtp:OAuth2:Scope"] = GetEnvironmentVariable("Smtp__OAuth2__Scope", "MAIL_SCOPE"),
            ["Minio:AccessKey"] = GetEnvironmentVariable("Minio__AccessKey", "Minio_AccessKey"),
            ["Minio:SecretKey"] = GetEnvironmentVariable("Minio__SecretKey", "Minio_SECRET_KEY"),
            // Minio .NET SDK expects endpoint as host[:port] (khong co scheme http/https).
            // Neu env truyen vao dang http(s)://..., ta normalize ve host[:port] va suy ra UseSSL neu chua set.
            ["Minio:Endpoint"] = minioEndpoint,
            ["Minio:BucketName"] = GetEnvironmentVariable("Minio__BucketName", "Minio_BUCKET"),
            ["Minio:MinioLocation"] = GetEnvironmentVariable("Minio__Location", "Minio_Location"),
            ["Minio:UseSSL"] = minioUseSslRaw
        };

        AddArrayOverride(overrides, "Gemini:ApiKeys", GetEnvironmentVariable("Gemini__ApiKeys", "GEMINI_API_KEYS"));
        builder.Configuration.AddInMemoryCollection(overrides.Where(x => !string.IsNullOrWhiteSpace(x.Value)));
        return builder;
    }

    private static (string? endpoint, bool? derivedUseSsl) NormalizeEndpoint(string? rawEndpoint)
    {
        if (string.IsNullOrWhiteSpace(rawEndpoint))
        {
            return (null, null);
        }

        var trimmed = rawEndpoint.Trim().TrimEnd('/');
        if (trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return (trimmed["https://".Length..], true);
        }

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
        {
            return (trimmed["http://".Length..], false);
        }

        return (trimmed, null);
    }

    private static string? GetEnvironmentVariable(params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private static void AddArrayOverride(IDictionary<string, string?> overrides, string sectionKey, string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return;
        }

        var values = rawValue
            .Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        for (var index = 0; index < values.Length; index++)
        {
            overrides[$"{sectionKey}:{index}"] = values[index];
        }
    }
}
