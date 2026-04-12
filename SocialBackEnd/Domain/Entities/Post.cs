using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class Post : AuditableEntity
{
    public Guid CommunityId { get; set; }
    public Community Community { get; set; } = null!;

    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? Url { get; set; }
    public PostType PostType { get; set; } = PostType.Text;
    public PostStatus Status { get; set; } = PostStatus.Published;
    public bool IsPinned { get; set; }
    public bool IsLocked { get; set; }
    public int Score { get; set; }
    public int CommentCount { get; set; }
    public int ViewCount { get; set; }
    public DateTime? PublishedAtUtc { get; set; }

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<PostVote> Votes { get; set; } = new List<PostVote>();
    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    public ICollection<PostMediaAsset> MediaAssets { get; set; } = new List<PostMediaAsset>();
    public ICollection<ContentReport> Reports { get; set; } = new List<ContentReport>();
}
