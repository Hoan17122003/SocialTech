using System;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public class UserFollowRepository : RepositoryBase<UserFollow>, IUserFollowRepository
{
    private readonly AppDbContext _context;
    private readonly DbSet<User> _usersContext;
    public UserFollowRepository(AppDbContext dbContext) : base(dbContext)
    {
        _context = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _usersContext = dbContext.Users;
    }

    public async Task<bool> FollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        if (followerId == followingId)
        {
            return false;
        }

        var usersExist = await _context.Users
            .AsNoTracking()
            .Where(x => x.Id == followerId || x.Id == followingId)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (usersExist.Count != 2)
        {
            return false;
        }

        var alreadyFollowing = await _context.UserFollows
            .AsNoTracking()
            .AnyAsync(
                x => x.FollowerId == followerId && x.FollowingId == followingId,
                cancellationToken);

        if (alreadyFollowing)
        {
            return false;
        }

        await _context.UserFollows.AddAsync(new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UnfollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        var usersExist = await _context.Users
            .AsNoTracking()
            .Where(x => x.Id == followerId || x.Id == followingId)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (usersExist.Count != 2)
        {
            return false;
        }

        var userFollow = await _context.UserFollows
            .FirstOrDefaultAsync(x => x.FollowerId == followerId && x.FollowingId == followingId, cancellationToken);

        if (userFollow == null)
        {
            return false;
        }

        _context.UserFollows.Remove(userFollow);
        await _context.SaveChangesAsync(cancellationToken);
        return true;

    }

    public Task<bool> IsFollowingAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        return _context.UserFollows
            .AsNoTracking()
            .AnyAsync(
                x => x.FollowerId == followerId && x.FollowingId == followingId,
                cancellationToken);
    }

    public Task<List<User>> GetFollowersAsync(int userId, CancellationToken cancellationToken = default)
    {
        return _context.UserFollows
            .AsNoTracking()
            .Where(x => x.FollowingId == userId)
            .Select(x => x.Follower)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public Task<List<User>> GetFollowingsAsync(int userId, CancellationToken cancellationToken = default)
    {
        return _context.UserFollows
            .AsNoTracking()
            .Where(x => x.FollowerId == userId)
            .Select(x => x.Following)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<List<User>> SearchTwoWayFollowersAsync(int userId, string query, CancellationToken cancellationToken = default)
    {
        var queryable = _usersContext
            .AsNoTracking()
            .Where(u => _context.UserFollows.Any(f => f.FollowerId == userId && f.FollowingId == u.Id)
                     && _context.UserFollows.Any(f => f.FollowerId == u.Id && f.FollowingId == userId));

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalizedQuery = query.Trim().ToLower();
            queryable = queryable.Where(u => u.DisplayName.ToLower().Contains(normalizedQuery) || u.Username.ToLower().Contains(normalizedQuery));
        }

        return await queryable.ToListAsync(cancellationToken);
    }
}
