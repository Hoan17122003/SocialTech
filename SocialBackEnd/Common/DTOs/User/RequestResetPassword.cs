using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Common.Validations;

namespace SocialBackEnd.Common.DTOs.User;

public record class RequestResetPassword
{
    [Required]
    public string Token { get; init; }

    [Required]
    [StrongPassword(MinimumLength = 12, ErrorMessage = "Password is not strong enough.")]
    public string NewPassword { get; init; }
}
