using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class CommentVote : EntityBase
{
    public int CommentId { get; set; }
    public Comment Comment { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public VoteType VoteType { get; set; }
}
