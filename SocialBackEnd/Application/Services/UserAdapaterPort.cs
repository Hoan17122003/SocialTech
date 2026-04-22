using Microsoft.Extensions.Logging;
using SocialBackEnd.Application.Notifications;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.Mail;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Services;

public sealed class UserAdapaterPort : IUserPort
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserAdapaterPort> _logger;
    private readonly IEmailNotificationService _emailNoificationService;
    private readonly IPasswordHashService _passwordHashService;

    public UserAdapaterPort(
        IUserRepository repository,
        ILogger<UserAdapaterPort> logger,
        IEmailNotificationService emailNotificationService,
        IPasswordHashService passwordHashService)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _emailNoificationService = emailNotificationService ?? throw new ArgumentNullException(nameof(emailNotificationService));
        _passwordHashService = passwordHashService ?? throw new ArgumentNullException(nameof(passwordHashService));
    }

    public async Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount)
    {
        _logger.LogInformation("Creating new user.");

        if (requestCreateAccount is null)
        {
            throw new ArgumentNullException(nameof(requestCreateAccount));
        }

        if (string.IsNullOrWhiteSpace(requestCreateAccount.Username))
        {
            throw new ArgumentException("Username is required.", nameof(requestCreateAccount));
        }

        if (string.IsNullOrWhiteSpace(requestCreateAccount.DisplayName))
        {
            throw new ArgumentException("Display name is required.", nameof(requestCreateAccount));
        }

        if (string.IsNullOrWhiteSpace(requestCreateAccount.Email))
        {
            throw new ArgumentException("Email is required.", nameof(requestCreateAccount));
        }

        if (string.IsNullOrWhiteSpace(requestCreateAccount.Password))
        {
            throw new ArgumentException("Password is required.", nameof(requestCreateAccount));
        }

        var normalizedUsername = requestCreateAccount.Username.Trim();
        var normalizedDisplayName = requestCreateAccount.DisplayName.Trim();
        var normalizedEmail = requestCreateAccount.Email.Trim();
        var passwordHash = _passwordHashService.HashPassword(requestCreateAccount.Password);

        // Repository hiện đang lấy request.Password để gán vào PasswordHash,
        // nên cần thay password plain text bằng chuỗi đã hash trước khi lưu.
        requestCreateAccount.Username = normalizedUsername;
        requestCreateAccount.DisplayName = normalizedDisplayName;
        requestCreateAccount.Email = normalizedEmail;
        requestCreateAccount.Password = passwordHash;

        var userEntity = await _repository.CreateUserAsync(requestCreateAccount);
        if (userEntity is null)
        {
            return 0;
        }

        var emailModel = new WelcomeEmailModel(
            Username: userEntity.Username,
            VerifyLink: $"https://yourapp.com/verify?userId={userEntity.Id}"
        );

        await _emailNoificationService.SendEmailAsync(
            to: userEntity.Email,
            model: emailModel,
            cancellationToken: default
        );

        return 1;
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        if (requestUpdateAccount is null)
        {
            throw new ArgumentNullException(nameof(requestUpdateAccount));
        }

        if (!string.IsNullOrWhiteSpace(requestUpdateAccount.Password))
        {
            requestUpdateAccount.Password = _passwordHashService.HashPassword(requestUpdateAccount.Password);
        }

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
