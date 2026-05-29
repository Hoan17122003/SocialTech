using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Security;

public sealed class UserAuthenticationService : IUserAuthenticationService
{
    private readonly IUserRepository _repository;
    private readonly IPasswordHashService _passwordHashService;
    private readonly ICacheInternal _cacheInternal;
    private readonly ILogger _logger;


    public UserAuthenticationService(
        IUserRepository repository,
        IPasswordHashService passwordHashService,
        ICacheInternal cacheInternal,
        ILogger<UserAuthenticationService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _passwordHashService = passwordHashService;
        _cacheInternal = cacheInternal ?? throw new ArgumentNullException(nameof(cacheInternal));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<(UserIdentity?, Guid)> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedEmail) || string.IsNullOrWhiteSpace(password))
        {
            return (null, Guid.Empty);
        }

        var user = await _repository.UserIsExists(normalizedEmail, null, cancellationToken);
        if (user is null)
        {
            return (null, Guid.Empty);
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            _logger.LogWarning("User found but password hash is missing.");
            return (null, Guid.Empty);
        }

        if (!IsPasswordValid(user, password))
        {
            await _cacheInternal.IncreaseFailedAttemptAsync(normalizedEmail);
            return (null, Guid.Empty);
        }

        await _cacheInternal.ResetFailedAttemptAsync(normalizedEmail);
        var publicIdOfuser = user.PublicId;

        return (new UserIdentity(
            UserId: user.Id.ToString(),
            Email: user.Email,
            Roles: ["User"],
            Permissions: ["users.read"]), publicIdOfuser);
    }

    private bool IsPasswordValid(User user, string password)
    {
        return _passwordHashService.VerifyPassword(user.PasswordHash, password);
    }
}
