namespace SocialBackEnd.Common.Models.Article;

public record CommentOfArticleModelView
{
    public CommentAuthorModelView AuthorOfComment { get; init; }
    public string Content { get; init; }
    public List<string> Attachments { get; init; } = new List<string>();
    public bool IsPermissionEdit { get; init; }
    public DateTime CreateDate { get; init; }
}

public record CommentAuthorModelView
{
    public int AuthorPublicId { get; init; }
    public string NameAuthor { get; init; }
    public string AvatarAuthor { get; init; }
}