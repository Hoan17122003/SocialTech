namespace SocialBackEnd.Domain.Entities;

public class Tag : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
}
