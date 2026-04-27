using System;
using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Common.DTOs.Article;

namespace SocialBackEnd.Common.Validations;

public class AtLeastOneRequiredAttributePost : ValidationAttribute
{
    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        Console.WriteLine("AtLeastOneRequiredAttributePost validation triggered.");
        var article = (RequestCreateArticle)validationContext.ObjectInstance;

        if (string.IsNullOrWhiteSpace(article.Content) && (article.Attachments == null || article.Attachments.Count == 0))
        {
            Console.WriteLine("AtLeastOneRequiredAttributePost validation failed.");
            return new ValidationResult("Bạn cần nhập nội dung hoặc tải lên ít nhất một tệp.");
        }
        Console.WriteLine("AtLeastOneRequiredAttributePost validation passed.");
        return ValidationResult.Success;
    }
}
