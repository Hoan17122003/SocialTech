using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class Post : EntityBase
{
    // allow for null for comunity and comunityId
    public int? CommunityId { get; set; }
    public Community Community { get; set; } = null!;
    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public PostType PostType { get; set; } = PostType.Text;
    public PostStatus Status { get; set; } = PostStatus.Published;
    public bool IsPinned { get; set; }
    public bool IsLocked { get; set; }
    public int ViewCount { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public ICollection<Attachments> Attachments { get; set; } = new List<Attachments>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<PostVote> Votes { get; set; } = new List<PostVote>();
    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    public ICollection<PostMediaAsset> MediaAssets { get; set; } = new List<PostMediaAsset>();
    public ICollection<ContentReport> Reports { get; set; } = new List<ContentReport>();
}
