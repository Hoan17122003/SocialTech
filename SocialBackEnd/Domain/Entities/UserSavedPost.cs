using System;

namespace SocialBackEnd.Domain.Entities;

public class UserSavedPost : EntityBase
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int PostId { get; set; }
    public Post Post { get; set; } = null!;

    public DateTime SavedAtUtc { get; set; } = DateTime.UtcNow;
}
