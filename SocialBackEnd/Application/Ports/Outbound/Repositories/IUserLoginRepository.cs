using System;
using SocialBackEnd.Common.DTOs.IpLogin;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IUserLoginRepository : IRepository<IPLogin>
{
    Task<bool> CreateIpLoginAsync(RequestIpLogin requestIpLogin);

    Task<bool> DestroyIpLoginAsync(int userId, string refreshToken);
    Task<bool> UpdateRefreshTokenAsync(int userId, CancellationToken cancellationToken);
    Task<IPLogin?> GetLatestIpLoginByUserIdAsync(int userId, CancellationToken cancellationToken);

}
