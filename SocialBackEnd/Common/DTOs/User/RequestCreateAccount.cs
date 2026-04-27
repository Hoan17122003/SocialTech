using System;
using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Common.Validations;

namespace SocialBackEnd.Common.DTOs.User;

public record RequestCreateAccount
{
    [Required]
    public string Username { get; set; }
    [Required]
    public string DisplayName { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [StrongPassword(MinimumLength = 12, ErrorMessage = "Password is not strong enough.")]
    public string Password { get; set; }

    public CancellationToken? CancellationToken { get; set; } = default;
}
