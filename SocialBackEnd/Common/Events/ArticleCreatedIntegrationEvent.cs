namespace SocialBackEnd.Common.Events;

public sealed record ArticleCreatedIntegrationEvent
{
    public int ArticleId { get; init; }
    public int AuthorId { get; init; }
    public string NameAuthor { get; init; }
    public string AvatarAuthor { get; init; }
    public string Title { get; init; }
    public int? CommunityId { get; init; }
    public string LinkArticle { get; init; }
    public string Thumbnail { get; init; }
    public string SubContent { get; init; }
    public List<string> EmailUserFollow { get; init; }
    public DateTime CreateDate { get; init; }
}
