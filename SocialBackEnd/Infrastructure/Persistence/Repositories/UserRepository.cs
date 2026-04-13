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
        // var user = new User
        // {
        //     Username = requestCreateAccount.Username,
        //     Email = requestCreateAccount.Email,
        //     PasswordHash = requestCreateAccount.PasswordHash,
        //     CreatedAt = DateTime.UtcNow
        // };

        // var userEntity = await CreateAsync(user);
        // return userEntity;
        return null;
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        // var user = await GetByIdAsync(userId);
        // if (user == null)
        // {
        //     return false;
        // }

        // user.Email = requestUpdateAccount.Email ?? user.Email;
        // user.PasswordHash = requestUpdateAccount.PasswordHash ?? user.PasswordHash;

        // await UpdateAsync(user);
        return true;
    }
}
