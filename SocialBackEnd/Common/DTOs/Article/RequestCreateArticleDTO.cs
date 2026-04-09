namespace SocialBackEnd.Common.DTOs;

public record class RequestCreateArticleDTO
{
    private string _title;
    private string _content;
    private string _author;
    private string _category;
    private string _tags;
}
