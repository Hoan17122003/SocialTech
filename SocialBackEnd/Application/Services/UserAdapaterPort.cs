using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.User;
using Microsoft.Extensions.Logging;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Common.DTOs;

namespace SocialBackEnd.Application.Services;

public sealed class UserAdapaterPort : IUserPort
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserAdapaterPort> _logger;

    public UserAdapaterPort(IUserRepository repository, ILogger<UserAdapaterPort> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount)
    {
        _logger.LogInformation("Creating new user.");
        var userEntity = await _repository.CreateUserAsync(requestCreateAccount);
        // return _repository.CreateUserAsync(requestCreateAccount) ? Task.FromResult(1) : Task.FromResult(0);
        return userEntity != null ? 1 : 0;
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        return await _repository.UpdateUserAsync(userId, requestUpdateAccount);
    }

    public async Task<ProfileModelView> GetUserProfileAsync(int userIdTarget, int userId)
    {
        var profile = await _repository.GetProfileAsync(userIdTarget);
        return profile with
        {
            IsPermissionEdit = userIdTarget == userId
        };
    }

    public async Task<bool> FollowUserAsync(int userId, int targetUserId)
    {

        return true;
    }

    public async Task<bool> UnfollowUserAsync(int userId, int targetUserId)
    {
        return true;
    }

    public async Task<List<DetailUserFollow>> GetDetailFollowersAsync(int userId, Paganation paganation)
    {
        return new List<DetailUserFollow>();
    }
}
