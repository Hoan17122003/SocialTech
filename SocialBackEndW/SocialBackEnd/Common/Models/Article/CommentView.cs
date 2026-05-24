using SocialBackEnd.Common.Models.Article;

namespace SocialBackEnd.Common.DTOs.Comment;

public record CommentView
{
    public int Id { get; init; }
    public string Content { get; init; } = string.Empty;
    public CommentAuthorModelView AuthorPublicId { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public List<string> Attachments { get; init; } = new List<string>();
    public bool IsPermissionEdit { get; init; } = true;
}