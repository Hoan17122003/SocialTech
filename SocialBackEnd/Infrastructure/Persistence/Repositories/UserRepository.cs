using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.User;
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

    public async Task<ProfileModelView> GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        var profile = await DbContext.Users
            .AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new ProfileModelView(
                x.DisplayName,
                x.Bio ?? string.Empty,
                x.ProfileImageUrl ?? string.Empty,
                x.IsPrivateAccount,
                x.Followers.Count,
                x.Followings.Count,
                x.AuthoredPosts
                    .OrderByDescending(post => post.PublishedAtUtc ?? post.CreatedAtUtc)
                    .Select(post => new PostModelView(
                        post.Id,
                        post.Title,
                        post.Attachments
                            .OrderBy(attachment => attachment.Id)
                            .Select(attachment => attachment.FilePath)
                            .ToList(),
                        post.Body ?? string.Empty,
                        post.UpdatedAtUtc ?? post.CreatedAtUtc
                    ))
                    .ToList(),
                false
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return profile ?? throw new KeyNotFoundException($"User with id {userId} was not found.");
    }

    public Task<List<DetailUserFollow>> GetDetailUserFollowAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default)
    {
        var page = paganation.Page <= 0 ? 1 : paganation.Page;
        var limit = paganation.Limit <= 0 ? 10 : paganation.Limit;

        return DbContext.Set<UserFollow>()
            .AsNoTracking()
            .Where(x => x.FollowingId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new DetailUserFollow(
                x.Follower.Id,
                x.Follower.ProfileImageUrl ?? string.Empty,
                x.Follower.DisplayName
            ))
            .ToListAsync(cancellationToken);
    }


}
