using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class PostVote : EntityBase
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public VoteType VoteType { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
