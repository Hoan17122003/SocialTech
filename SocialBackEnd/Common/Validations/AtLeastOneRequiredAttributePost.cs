using System;
using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Common.DTOs.Article;

namespace SocialBackEnd.Common.Validations;

public class AtLeastOneRequiredAttributePost : ValidationAttribute
{
    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        var article = (RequestCreateArticle)validationContext.ObjectInstance;

        if (string.IsNullOrWhiteSpace(article.Content) && (article.FileUploads == null || article.FileUploads.Count == 0))
        {
            return new ValidationResult("Bạn cần nhập nội dung hoặc tải lên ít nhất một tệp.");
        }
        return ValidationResult.Success;
    }
}
