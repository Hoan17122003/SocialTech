namespace SocialBackEnd.Common.DTOs;

public record class RequestCreateArticleDTO
{
    public string Title { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public IReadOnlyCollection<string> Tags { get; init; } = Array.Empty<string>();
}
