namespace SocialBackEnd.Common.Models.Article;

public record ArticleDetailModelView
{
    public string Title { get; init; }
    public string Content { get; init; }
    public List<string> attachments = new List<string>();
    public bool IsPermissionEdit { get; init; }
    public DateTime CreateDate { get; init; }
    public string NameAuthor { get; init; }
    public string AvatarAuthor { get; init; }
}
