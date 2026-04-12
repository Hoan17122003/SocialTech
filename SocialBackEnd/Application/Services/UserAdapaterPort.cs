using System;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Infrastructure.Persistence.Repositories;

namespace SocialBackEnd.Application.Services;

public sealed class UserAdapaterPort : IUserPort
{

    private readonly UserRepository _repository;
    private readonly Logger<UserAdapaterPort> _logger;

    public UserAdapaterPort(UserRepository repository, Logger<UserAdapaterPort> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount)
    {
        _logger.LogInformation("Creating new user.");
        // return _repository.CreateUserAsync(requestCreateAccount) ? Task.FromResult(1) : Task.FromResult(0);
        return Task.FromResult(0);
    }

    public Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        return _repository.UpdateUserAsync(userId, requestUpdateAccount);
    }

}
