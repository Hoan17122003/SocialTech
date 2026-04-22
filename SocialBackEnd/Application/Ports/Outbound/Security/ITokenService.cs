using System;

namespace SocialBackEnd.Application.Ports.Outbound.Security;

public interface ITokenService
{
    string CreateAccessToken(UserIdentity user);
}

public sealed record UserIdentity(
    string UserId,
    string Email,
    string[] Roles,
    string[] Permissions);