using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class Community : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RulesSummary { get; set; }
    public CommunityVisibility Visibility { get; set; } = CommunityVisibility.Public;
    public bool IsNsfw { get; set; }
    public int MemberCount { get; set; }
    public int PostCount { get; set; }
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public ICollection<CommunityRule> Rules { get; set; } = new List<CommunityRule>();
    public ICollection<CommunityMembership> Members { get; set; } = new List<CommunityMembership>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<ContentReport> Reports { get; set; } = new List<ContentReport>();
}
