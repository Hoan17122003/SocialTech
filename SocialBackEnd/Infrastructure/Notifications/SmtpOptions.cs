namespace SocialBackEnd.Infrastructure.Notifications;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public bool UseSsl { get; set; } = true;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "SocialTech";
    public OAuth2Options OAuth2 { get; set; } = new();
}

public sealed class OAuth2Options
{
    public string TokenEndpoint { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
}
