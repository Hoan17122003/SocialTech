using System;

namespace SocialBackEnd.Domain.Entities;

public sealed class UserFollow : EntityBase
{
    public int FollowerId { get; set; }
    public User Follower { get; set; } = null!;

    public int FollowingId { get; set; }
    public User Following { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
