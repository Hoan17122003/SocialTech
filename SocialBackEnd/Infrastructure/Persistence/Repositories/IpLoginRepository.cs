using System;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.IpLogin;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class IpLoginRepository : RepositoryBase<IPLogin>, IUserLoginRepository
{
    public IpLoginRepository(AppDbContext dbContext) : base(dbContext)
    {

    }

    public async Task<bool> CreateIpLogin(RequestIpLogin requestIpLogin)
    {
        var ipLogin = new IPLogin
        {
            RefreshToken = requestIpLogin.RefreshToken,
            IpAddress = requestIpLogin.IpAddress,
            UserId = requestIpLogin.UserId
        };
        await DbContext.IPLogins.AddAsync(ipLogin);
        await DbContext.SaveChangesAsync();
        return true;

    }

    public async Task<bool> DestroyIpLogin(int userId, string refreshToken)
    {
        var refreshExists = await DbContext.IPLogins
            .FirstOrDefaultAsync(x => x.UserId == userId && x.RefreshToken == refreshToken);
        if (refreshExists is null) return false;
        DbContext.IPLogins.Remove(refreshExists);
        DbContext.SaveChangesAsync();
        return true;
    }

}
