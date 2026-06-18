using System;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public class UserFollowRepository : RepositoryBase<UserFollow>, IUserFollowRepository
{
    private readonly AppDbContext _context;
    public UserFollowRepository(AppDbContext dbContext) : base(dbContext)
    {
        _context = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    public async Task<bool> FollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        if (followerId == followingId)
        {
            return false;
        }

        var usersExist = await _context.Users
            .Where(x => x.Id == followerId || x.Id == followingId)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (usersExist.Count != 2)
        {
            return false;
        }

        var alreadyFollowing = await DbContext.Set<UserFollow>()
            .AsNoTracking()
            .AnyAsync(
                x => x.FollowerId == followerId && x.FollowingId == followingId,
                cancellationToken);

        if (alreadyFollowing)
        {
            return false;
        }

        await DbContext.Set<UserFollow>().AddAsync(new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId
        }, cancellationToken);

        await DbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UnfollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        var usersExist = await _context.Users
            .Where(x => x.Id == followerId || x.Id == followingId)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (usersExist.Count != 2)
        {
            return false;
        }

        var userFollow = await DbContext.Set<UserFollow>()
            .FirstOrDefaultAsync(x => x.FollowerId == followerId && x.FollowingId == followingId, cancellationToken);

        if (userFollow == null)
        {
            return false;
        }

        DbContext.Set<UserFollow>().Remove(userFollow);
        await DbContext.SaveChangesAsync(cancellationToken);
        return true;

    }

    public Task<bool> IsFollowingAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        return DbContext.Set<UserFollow>()
            .AsNoTracking()
            .AnyAsync(
                x => x.FollowerId == followerId && x.FollowingId == followingId,
                cancellationToken);
    }

    public Task<List<User>> GetFollowersAsync(int userId, CancellationToken cancellationToken = default)
    {
        return DbContext.Set<UserFollow>()
            .AsNoTracking()
            .Where(x => x.FollowingId == userId)
            .Select(x => x.Follower)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public Task<List<User>> GetFollowingsAsync(int userId, CancellationToken cancellationToken = default)
    {
        return DbContext.Set<UserFollow>()
            .AsNoTracking()
            .Where(x => x.FollowerId == userId)
            .Select(x => x.Following)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<List<User>> SearchTwoWayFollowersAsync(int userId, string query, CancellationToken cancellationToken = default)
    {
        var queryable = DbContext.Set<User>()
            .AsNoTracking()
            .Where(u => DbContext.Set<UserFollow>().Any(f => f.FollowerId == userId && f.FollowingId == u.Id)
                     && DbContext.Set<UserFollow>().Any(f => f.FollowerId == u.Id && f.FollowingId == userId));

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalizedQuery = query.Trim().ToLower();
            queryable = queryable.Where(u => u.DisplayName.ToLower().Contains(normalizedQuery) || u.Username.ToLower().Contains(normalizedQuery));
        }

        return await queryable.ToListAsync(cancellationToken);
    }
}
