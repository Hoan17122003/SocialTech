using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Common.Validations;

namespace SocialBackEnd.Common.DTOs.Article;

[AtLeastOneRequiredAttributePost]
public record RequestCreateArticle
{
    [Required]
    [Length(minimumLength: 1, maximumLength: 255, ErrorMessage = "Độ dài bạn cần nhập tối thiểu là 1")]
    public string Title { set; get; }
    public string? Content { set; get; }
    public List<IFormFile>? Attachments { set; get; }
    public int? ComunityId { set; get; }

}