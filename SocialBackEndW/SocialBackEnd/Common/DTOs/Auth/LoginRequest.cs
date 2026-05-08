using System.ComponentModel.DataAnnotations;

namespace SocialBackEnd.Common.DTOs.Auth;

public sealed record LoginRequest
(
    [EmailAddress]
    string Email,
    string Password
);