namespace SocialBackEnd.Common.DTOs.Article;

public record class RequestUpdateArticle
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public List<IFormFile> FileUploads { get; set; }
    public int? CommunityId { get; set; }
}
