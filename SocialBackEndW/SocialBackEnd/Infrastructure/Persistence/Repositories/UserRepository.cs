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
            // Password da duoc hash truoc o Application service.
            PasswordHash = requestCreateAccount.Password,
            PublicId = Guid.NewGuid()
        };
        var userEntity = await DbContext.Users.AddAsync(user, CancellationToken.None);
        await DbContext.SaveChangesAsync();
        return userEntity.Entity;
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount, string? profileImageUrl = null)
    {
        var user = await DbContext.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
        {
            return false;
        }

        var hasChanges = false;

        if (!string.IsNullOrWhiteSpace(requestUpdateAccount.DisplayName) &&
            !string.Equals(user.DisplayName, requestUpdateAccount.DisplayName, StringComparison.Ordinal))
        {
            user.DisplayName = requestUpdateAccount.DisplayName;
            hasChanges = true;
        }

        if (!string.IsNullOrWhiteSpace(requestUpdateAccount.Password) &&
            !string.Equals(user.PasswordHash, requestUpdateAccount.Password, StringComparison.Ordinal))
        {
            // Password neu co duoc cap nhat thi da duoc hash truoc o Application service.
            user.PasswordHash = requestUpdateAccount.Password;
            hasChanges = true;
        }

        if (!string.IsNullOrWhiteSpace(requestUpdateAccount.Bio) &&
            !string.Equals(user.Bio, requestUpdateAccount.Bio, StringComparison.Ordinal))
        {
            user.Bio = requestUpdateAccount.Bio;
            hasChanges = true;
        }

        if (!string.IsNullOrWhiteSpace(profileImageUrl) &&
            !string.Equals(user.ProfileImageUrl, profileImageUrl, StringComparison.Ordinal))
        {
            user.ProfileImageUrl = profileImageUrl;
            hasChanges = true;
        }

        if (!hasChanges)
        {
            return true;
        }

        await DbContext.SaveChangesAsync();
        return true;
    }

    public async Task<(bool, bool)> ChangePassword(string email, string newPasswordHash)
    {
        var user = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return (false, false);
        }
        user.PasswordHash = newPasswordHash;
        await DbContext.SaveChangesAsync();
        return (true, true);
    }

    public async Task<ProfileModelView> GetProfileAsync(Guid publicId, CancellationToken cancellationToken = default)
    {
        var profile = await DbContext.Users
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => new ProfileModelView
            {
                Id = x.Id,
                DisplayName = x.DisplayName,
                Bio = x.Bio ?? string.Empty,
                ProfileImageUrl = x.ProfileImageUrl ?? string.Empty,
                IsPrivateAccount = x.IsPrivateAccount,
                FollowersCount = x.Followers.Count,
                FollowingsCount = x.Followings.Count,
                RecentPosts = x.AuthoredPosts
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
                IsPermissionEdit = false
            })
            .FirstOrDefaultAsync(cancellationToken);

        return profile ?? throw new KeyNotFoundException($"User with id {publicId} was not found.");
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

    public async Task<string> Validate(int userId)
    {
        return await DbContext.Users
            .Where(x => x.Id == userId)
            .Select(x => x.Email)
            .FirstOrDefaultAsync();
    }

    public async Task<User?> UserIsExists(
        string? email,
        string? username,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        var normalizedUsername = string.IsNullOrWhiteSpace(username) ? null : username.Trim();

        if (normalizedEmail is null && normalizedUsername is null)
        {
            return null;
        }

        return await DbContext.Users
            .AsNoTracking()
            .Where(x =>
                (normalizedEmail != null && x.Email == normalizedEmail) ||
                (normalizedUsername != null && x.Username == normalizedUsername))
            .Select(x => new User
            {
                Id = x.Id,
                Email = x.Email,
                Username = x.Username,
                DisplayName = x.DisplayName,
                PasswordHash = x.PasswordHash,
                PublicId = x.PublicId
            })
            .FirstOrDefaultAsync(cancellationToken);
    }


}
