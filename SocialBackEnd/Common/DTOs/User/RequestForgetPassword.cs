using System.ComponentModel.DataAnnotations;

namespace SocialBackEnd.Common.DTOs.User;

public record class RequestForgetPassword
{
    [Required]
    [EmailAddress]
    public string Email { get; set; }
}
