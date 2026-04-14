using System.ComponentModel;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public sealed class UserRepository : RepositoryBase<User>, IUserRepository
{
    public UserRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return DbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
    }


    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return DbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public async Task<User> CreateUserAsync(RequestCreateAccount requestCreateAccount)
    {
        var user = new User
        {
            Username = requestCreateAccount.Username,
            DisplayName = requestCreateAccount.DisplayName,
            Email = requestCreateAccount.Email,
            PasswordHash = requestCreateAccount.Password, // In a real application, hash the password before storing
        };
        var userEntity = await DbContext.Users.AddAsync(user, CancellationToken.None);
        await DbContext.SaveChangesAsync();
        return userEntity.Entity;
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        var affectedRows = await DbContext
            .Users
            .Where(x => x.Id == userId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.DisplayName, requestUpdateAccount.DisplayName)
                .SetProperty(x => x.PasswordHash, requestUpdateAccount.Password)
                .SetProperty(x => x.Bio, requestUpdateAccount.Bio)
                .SetProperty(x => x.ProfileImageUrl, requestUpdateAccount.ProfileImageUrl));

        return affectedRows > 0;
    }

    public async User GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await DbContext.Users
            .AsNoTracking()
            .Select(x => new
            {
                FollwersCount = x.Followers.Count,
                FollowingCount = x.Following.Count,
            })
            .FirstOrDefaultAsync();
    }
}
