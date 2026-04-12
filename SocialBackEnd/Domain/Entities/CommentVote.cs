using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class CommentVote : EntityBase
{
    public Guid CommentId { get; set; }
    public Comment Comment { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public VoteType VoteType { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
