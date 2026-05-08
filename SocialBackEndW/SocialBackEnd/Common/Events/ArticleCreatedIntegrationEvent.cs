namespace SocialBackEnd.Common.Events;

public sealed record ArticleCreatedIntegrationEvent
{
    public int ArticleId { get; init; }
    public int AuthorId { get; init; }
    public string NameAuthor { get; init; }
    public string AvatarAuthor { get; set; }
    public string Title { get; init; }
    public int? CommunityId { get; init; }
    public string LinkArticle { get; init; }
    public string LinkProfileAuthor { get; init; }
    public string Thumbnail { get; set; }
    public string SubContent { get; init; }
    public List<string> EmailUserFollow { get; init; }
    public DateTime CreateDate { get; init; }
}
