using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class PostVote : EntityBase
{
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public VoteType VoteType { get; set; }
}
