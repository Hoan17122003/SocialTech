using System;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Common.DTOs.Auth;

namespace SocialBackEnd.Application.Ports.Inbound.web;

public interface IAuthenticationPort
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(int userId, string accessToken, CancellationToken cancellationToken = default);
}
