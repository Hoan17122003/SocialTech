namespace SocialBackEnd.Domain.Entities;

public abstract class AuditableEntity : EntityBase
{
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}
