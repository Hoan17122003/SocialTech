using System;

namespace SocialBackEnd.Application.Ports;

public interface IAuthenticationPort
{
    Task<string> Login(int userId);

    Task<bool> Logout(int userId, string refreshToken);

    Task<string> RefreshAccessToken(int userId);
}
