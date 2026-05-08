namespace SocialBackEnd.Domain.Entities;

public sealed class SystemStatus : EntityBase
{
    public string Name { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public string Environment { get; set; } = string.Empty;

    public DateTime UtcTime { get; set; } 
}
