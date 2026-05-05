namespace SocialBackEnd.Common.DTOs.Article;

public sealed record ArticleValidateRequest
{
    public string? Title { get; init; }
    public string? Content { get; init; }
    public List<IFormFile>? Attachments { get; init; }
};