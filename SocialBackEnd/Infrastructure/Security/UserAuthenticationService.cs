using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Security;

public sealed class UserAuthenticationService : IUserAuthenticationService
{
    private readonly IUserRepository _repository;
    private readonly IPasswordHashService _passwordHashService;


    public UserAuthenticationService(
        IUserRepository repository,
        IPasswordHashService passwordHashService)
    {
        _repository = repository;
        _passwordHashService = passwordHashService;
    }

    public async Task<UserIdentity?> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedEmail) || string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        var user = await _repository.UserIsExists(normalizedEmail, null, cancellationToken);
        if (user is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return null;
        }

        if (!IsPasswordValid(user, password))
        {
            return null;
        }

        return new UserIdentity(
            UserId: user.Id.ToString(),
            Email: user.Email,
            Roles: ["User"],
            Permissions: ["users.read"]);
    }

    private bool IsPasswordValid(User user, string password)
    {
        return _passwordHashService.VerifyPassword(user.PasswordHash, password);
    }
}
