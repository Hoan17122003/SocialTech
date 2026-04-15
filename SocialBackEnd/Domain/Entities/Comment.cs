using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class Comment : EntityBase
{
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;

    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;

    public int? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }

    public string Body { get; set; } = string.Empty;
    public CommentStatus Status { get; set; } = CommentStatus.Published;
    public bool IsLocked { get; set; }
    public int Score { get; set; }
    public int Depth { get; set; }

    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
    public ICollection<CommentVote> Votes { get; set; } = new List<CommentVote>();
    public ICollection<ContentReport> Reports { get; set; } = new List<ContentReport>();
}
