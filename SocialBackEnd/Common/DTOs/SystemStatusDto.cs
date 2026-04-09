namespace SocialBackEnd.Application.DTOs;

public sealed class SystemStatusDto
{

    public string Name { get; init; } = string.Empty;

    public string Version { get; init; } = string.Empty;

    public string Environment { get; init; } = string.Empty;

    public DateTime UtcTime { get; init; }
}
