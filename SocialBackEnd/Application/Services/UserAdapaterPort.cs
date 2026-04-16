using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.User;
using Microsoft.Extensions.Logging;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Domain.Entities;

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

    public Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount)
    {
        _logger.LogInformation("Creating new user.");
        var userEntity = _repository.CreateUserAsync(requestCreateAccount);


        var response = new ApiResponse<User>
        {

        };
        // return _repository.CreateUserAsync(requestCreateAccount) ? Task.FromResult(1) : Task.FromResult(0);
        return Task.FromResult(0);
    }

    public Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        return _repository.UpdateUserAsync(userId, requestUpdateAccount);
    }

}
