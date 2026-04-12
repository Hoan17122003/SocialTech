using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class CommunityMembership : AuditableEntity
{
    public Guid CommunityId { get; set; }
    public Community Community { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public CommunityMemberRole Role { get; set; } = CommunityMemberRole.Member;
    public CommunityMemberStatus Status { get; set; } = CommunityMemberStatus.Active;
    public DateTime? LastVisitedAtUtc { get; set; }
}
