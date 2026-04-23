using System.ComponentModel.DataAnnotations;

namespace SocialBackEnd.Common.DTOs.Article;

public record RequestCreateArticle
{
    [Required]
    [Length(minimumLength: 1, maximumLength: 255, ErrorMessage = "Độ dài bạn cần nhập tối thiểu là 1")]
    string Title { set; get; }

    string? Content { set; get; }


}