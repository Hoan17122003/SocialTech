namespace SocialBackEnd.Common.Models.Article;

public record ArticleDetailModelView
{
    public int Id { get; init; }
    public string Title { get; init; }
    public string Content { get; init; }
    public List<string> Attachments { get; init; } = new List<string>();
    public bool IsPermissionEdit { get; init; }
    public DateTime CreateDate { get; init; }
    public string NameAuthor { get; init; }
    public int CountComment { get; init; } = 0;
    public int CountReact { get; init; } = 0;
    public Guid PublicIdAuthor { get; init; }
    public string AvatarAuthor { get; init; }
}
