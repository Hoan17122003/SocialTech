using System;
using SocialBackEnd.Common.DTOs.IpLogin;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IUserLoginRepository : IRepository<IPLogin>
{
    Task<bool> CreateIpLogin(RequestIpLogin requestIpLogin);

    Task<bool> DestroyIpLogin(int userId, string refreshToken);

}
