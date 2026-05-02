namespace SocialBackEnd.Common.Events;

public sealed record ArticleCreatedIntegrationEvent(
    int ArticleId,
    int AuthorId,
    string Title,
    int? CommunityId,
    int AttachmentCount);
