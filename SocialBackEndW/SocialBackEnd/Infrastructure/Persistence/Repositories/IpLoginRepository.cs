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

    public async Task<bool> CreateIpLoginAsync(RequestIpLogin requestIpLogin)
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

    public async Task<IPLogin?> GetLatestIpLoginByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        var ipLogin = await DbContext.IPLogins
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        return ipLogin;
    }

    public async Task<bool> DestroyIpLoginAsync(int userId, string refreshToken)
    {
        var refreshExists = await DbContext.IPLogins
            .FirstOrDefaultAsync(x => x.UserId == userId && x.RefreshToken == refreshToken);
        if (refreshExists is null) return false;
        DbContext.IPLogins.Remove(refreshExists);
        await DbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateRefreshTokenAsync(int userId, CancellationToken cancellationToken)
    {
        var ipLogin = await DbContext.IPLogins
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (ipLogin is null) return false;
        ipLogin.RefreshToken = string.Empty;
        ipLogin.UpdatedAtUtc = DateTime.UtcNow;
        DbContext.IPLogins.Update(ipLogin);
        var affectedRows = await DbContext.SaveChangesAsync(cancellationToken);
        return affectedRows > 0;
    }

}
