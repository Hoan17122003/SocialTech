namespace SocialBackEnd.Domain.Entities;

public class CommunityRule : EntityBase
{
    public Guid CommunityId { get; set; }
    public Community Community { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
