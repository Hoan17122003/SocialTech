using System;
using SocialBackEnd.Application.Ports;

namespace SocialBackEnd.Application.Services;

public class AuthenticationAdapterPort : IAuthenticationPort
{

    public async Task<string> Login(int userId)
    {
        return "hehehe";
    }

    public async Task<bool> Logout(int userId, string refreshoken)
    {
        return true;
    }

    public async Task<string> RefreshAccessToken(int userId)
    {
        return "hehehe";
    }

}
