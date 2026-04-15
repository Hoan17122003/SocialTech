using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class ContentReport : EntityBase
{
    public int CommunityId { get; set; }
    public Community Community { get; set; } = null!;

    public int ReporterUserId { get; set; }
    public User ReporterUser { get; set; } = null!;

    public int? AssignedModeratorId { get; set; }
    public User? AssignedModerator { get; set; }

    public int? PostId { get; set; }
    public Post? Post { get; set; }

    public int? CommentId { get; set; }
    public Comment? Comment { get; set; }

    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public DateTime? ReviewedAtUtc { get; set; }
}
