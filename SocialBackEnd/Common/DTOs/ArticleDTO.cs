namespace SocialBackEnd.Common.DTOs;

public record class ArticleDTO
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
}
