namespace SocialBackend.Common.Events;

public sealed record CommentCreatedIntegrationEvent
{
    public int CommentId { get; init; }
    public int CommentAuthorId { get; init; }
    public string CommentAuthorDisplayName { get; init; } = string.Empty;
    public string CommentAuthorAvatarUrl { get; init; } = string.Empty;
    public string CommentBody { get; init; } = string.Empty;
    public int? ParentCommentId { get; init; }
    public int? ParentCommentAuthorId { get; init; }
    public string? ParentCommentAuthorDisplayName { get; init; }
    public int ArticleId { get; init; }
    public int ArticleAuthorId { get; init; }
    public string ArticleAuthorDisplayName { get; init; } = string.Empty;
    public DateTime CreateDate { get; init; } = DateTime.UtcNow;
}