using System;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public class UserFollowRepository : Repositories<UserFollow>, IUserRepository
{
    public UserFollowRepository(AppDbContext dbContext) : base(dbContext)
    {
    }
    DbSet<UserFollow> UserFollows { get; set; }

    public Task<bool> FollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<bool> UnfollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<bool> IsFollowingAsync(int followerId, int followingId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<List<User>> GetFollowersAsync(int userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<List<User>> GetFollowingsAsync(int userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}
