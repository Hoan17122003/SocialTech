using System;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IUserFollowRepository : IRepository<UserFollow>
{
    Task<bool> FollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default);
    Task<bool> UnfollowAsync(int followerId, int followingId, CancellationToken cancellationToken = default);
    Task<bool> IsFollowingAsync(int followerId, int followingId, CancellationToken cancellationToken = default);
    Task<List<User>> GetFollowersAsync(int userId, CancellationToken cancellationToken = default);
    Task<List<User>> GetFollowingsAsync(int userId, CancellationToken cancellationToken = default);

}
