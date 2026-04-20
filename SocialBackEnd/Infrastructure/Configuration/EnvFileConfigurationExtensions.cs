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

        var overrides = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["Smtp:FromEmail"] = GetEnvironmentVariable("Smtp__FromEmail", "ADMIN_EMAIL_ADDRESS"),
            ["Smtp:OAuth2:ClientId"] = GetEnvironmentVariable("Smtp__OAuth2__ClientId", "MAILER_CLIENT_ID"),
            ["Smtp:OAuth2:ClientSecret"] = GetEnvironmentVariable("Smtp__OAuth2__ClientSecret", "MAILER_CLIENT_SECRET"),
            ["Smtp:OAuth2:RefreshToken"] = GetEnvironmentVariable("Smtp__OAuth2__RefreshToken", "MAIL_REFRESH"),
            ["Smtp:OAuth2:TokenEndpoint"] = GetEnvironmentVariable("Smtp__OAuth2__TokenEndpoint", "MAIL_TOKEN_ENDPOINT"),
            ["Smtp:OAuth2:Scope"] = GetEnvironmentVariable("Smtp__OAuth2__Scope", "MAIL_SCOPE")
        };

        builder.Configuration.AddInMemoryCollection(overrides.Where(x => !string.IsNullOrWhiteSpace(x.Value)));
        return builder;
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
}
