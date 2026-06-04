using StackExchange.Redis;

namespace SocialBackEnd.Common.DTOs.Auth;

public sealed record LoginResponse
(
    string AccessToken,
    string TokenType,
    Guid PublicId,
    string Role
);