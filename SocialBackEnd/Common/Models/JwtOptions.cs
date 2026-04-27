using System;

namespace SocialBackEnd.Common.Models;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { init; get; } = string.Empty;
    public string Audience { init; get; } = string.Empty;
    public string SecretKey { init; get; } = string.Empty;
    public int AccessTokenMinutes { init; get; } = 15;
}
