using System;

namespace SocialBackEnd.Common.DTOs.User;

public record RequestUpdateAccount
{
    public string? DisplayName { get; set; }
    public string? Password { get; set; }
    public string? Bio { get; set; }

    public string? ProfileImageUrl { get; set; }

}
