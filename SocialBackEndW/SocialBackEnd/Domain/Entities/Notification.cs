namespace SocialBackEnd.Domain.Entities;

public sealed class Notification : EntityBase
{
    public int RecipientUserId { get; set; }
    public User RecipientUser { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}
