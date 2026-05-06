using System.IdentityModel.Tokens.Jwt;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Application.Ports.Outbound.Events;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Common.Constants;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Services;

public sealed class UserAdapaterPort : IUserPort
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserAdapaterPort> _logger;
    private readonly IPasswordHashService _passwordHashService;
    private readonly IEntityMediaStorageService _entityMediaStorageService;
    private readonly IUserFollowRepository _userFollowRepository;
    private readonly ICacheInternal _cacheInternal;
    private readonly IApplicationEventPublisher _applicationEventPublisher;
    private readonly JwtOptions _jwtOptions;

    public UserAdapaterPort(
        IUserRepository repository,
        ILogger<UserAdapaterPort> logger,
        IPasswordHashService passwordHashService,
        IEntityMediaStorageService entityMediaStorageService,
        IUserFollowRepository userFollowRepository,
        ICacheInternal cacheInternal,
        IApplicationEventPublisher applicationEventPublisher,
        IOptions<JwtOptions> jwtOptions)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _passwordHashService = passwordHashService ?? throw new ArgumentNullException(nameof(passwordHashService));
        _entityMediaStorageService = entityMediaStorageService ?? throw new ArgumentNullException(nameof(entityMediaStorageService));
        _userFollowRepository = userFollowRepository ?? throw new ArgumentException(nameof(_userFollowRepository));
        _cacheInternal = cacheInternal ?? throw new ArgumentNullException(nameof(cacheInternal));
        _applicationEventPublisher = applicationEventPublisher ?? throw new ArgumentNullException(nameof(applicationEventPublisher));
        _jwtOptions = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
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

        await _applicationEventPublisher.PublishWelcomeEmailRequestedAsync(
            userEntity,
            $"https://yourapp.com/verify?userId={userEntity.Id}");

        return 1;
    }

    public async Task<bool> RequestForgetPasswordAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.", nameof(email));
        }
        var normalizedEmail = email.Trim();
        var user = await _repository.GetByEmailAsync(normalizedEmail);
        if (user is null)
        {
            return false;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new (JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new (JwtRegisteredClaimNames.Email, user.Email),
            new (ClaimTypes.NameIdentifier, user.Id.ToString()),
            new (ClaimTypes.Email, user.Email)
        };

        var jwtToken = new JwtSecurityToken(
          issuer: _jwtOptions.Issuer,
          audience: _jwtOptions.Audience,
          claims: claims,
           expires: DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes),
          signingCredentials: credentials);

        var tokenOfUser = new JwtSecurityTokenHandler().WriteToken(jwtToken);

        var token = Guid.NewGuid().ToString();
        var cacheKey = $"{Constant.PrefixRequestForgetPassword}:{normalizedEmail}";
        var timeSpan = TimeSpan.FromMinutes(2);
        var tokenResult = $"{token}@{tokenOfUser}";
        // Store the token in cache with an expiration time
        var resultCache = await _cacheInternal.SetAsync<string>(cacheKey, tokenResult, timeSpan);
        if (!resultCache)
        {
            _logger.LogError("Failed to set forget password token in cache for email {Email}", normalizedEmail);
            return false;
        }
        await _applicationEventPublisher.PublishForgetPasswordEmailRequestedAsync(
            user,
            $"https://yourapp.com/reset-password?token={tokenResult}");

        return true;
    }

    public async Task<bool> ValidateResetPasswordTokenAsync(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ValidationException("Token không hợp lệ hoặc đã hết hạn.", new[] { "token" });
        }

        if (string.IsNullOrWhiteSpace(newPassword))
        {
            throw new ValidationException("Mật khẩu mới là bắt buộc.", new[] { "newPassword" });
        }

        var tokenParts = token.Split('@', 2);
        if (tokenParts.Length != 2 ||
            string.IsNullOrWhiteSpace(tokenParts[0]) ||
            string.IsNullOrWhiteSpace(tokenParts[1]))
        {
            throw new ValidationException("Token không hợp lệ hoặc đã hết hạn.", new[] { "token" });
        }

        var tokenOfJwt = tokenParts[1];
        var email = GetEmailFromResetPasswordJwt(tokenOfJwt);
        var tokenCacheKey = $"{Constant.PrefixRequestForgetPassword}:{email}";

        var cachedToken = await _cacheInternal.GetAsync<string>(tokenCacheKey);
        if (cachedToken is null || !string.Equals(cachedToken, token, StringComparison.Ordinal))
        {
            throw new ValidationException("Token không hợp lệ hoặc đã hết hạn.", new[] { "token" });
        }

        var newPasswordHash = _passwordHashService.HashPassword(newPassword.Trim());
        var (userExists, passwordUpdated) = await _repository.ChangePassword(email, newPasswordHash);
        if (!userExists || !passwordUpdated)
        {
            return false;
        }

        await _cacheInternal.RemoveAsync(tokenCacheKey);
        return true;
    }

    private string GetEmailFromResetPasswordJwt(string tokenOfJwt)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);

        try
        {
            var principal = tokenHandler.ValidateToken(tokenOfJwt, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _jwtOptions.Issuer,
                ValidAudience = _jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.FromSeconds(30)
            }, out _);

            var email = principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue(JwtRegisteredClaimNames.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                throw new ValidationException("Token không chứa email hợp lệ.", new[] { "token" });
            }

            return email.Trim();
        }
        catch (SecurityTokenException)
        {
            throw new ValidationException("Token không hợp lệ hoặc đã hết hạn.", new[] { "token" });
        }
        catch (ArgumentException)
        {
            throw new ValidationException("Token không hợp lệ hoặc đã hết hạn.", new[] { "token" });
        }
    }

    public async Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount)
    {
        if (requestUpdateAccount is null)
        {
            throw new ArgumentNullException(nameof(requestUpdateAccount));
        }

        var user = await _repository.GetByIdAsync(userId);
        if (user is null)
        {
            return false;
        }

        requestUpdateAccount.DisplayName = string.IsNullOrWhiteSpace(requestUpdateAccount.DisplayName)
            ? null
            : requestUpdateAccount.DisplayName.Trim();

        requestUpdateAccount.Bio = string.IsNullOrWhiteSpace(requestUpdateAccount.Bio)
            ? null
            : requestUpdateAccount.Bio.Trim();

        if (!string.IsNullOrWhiteSpace(requestUpdateAccount.Password))
        {
            requestUpdateAccount.Password = _passwordHashService.HashPassword(requestUpdateAccount.Password.Trim());
        }
        else
        {
            requestUpdateAccount.Password = null;
        }

        string? profileImageUrl = null;
        if (requestUpdateAccount.ProfileImageUrl is not null && requestUpdateAccount.ProfileImageUrl.Length > 0)
        {
            profileImageUrl = await _entityMediaStorageService.SaveUserProfileImageAsync(
                userId,
                requestUpdateAccount.ProfileImageUrl,
                user.ProfileImageUrl);
        }

        return await _repository.UpdateUserAsync(userId, requestUpdateAccount, profileImageUrl);
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
        if (userId == targetUserId)
        {
            throw new ValidationException("Bạn không thể tự follow chính mình",
                new[] { "userId and targetUserId must be diffrent." });
        }
        var userExists = await _repository.GetByIdAsync(targetUserId);
        if (userExists is null)
        {
            throw new NotFoundException("User không tồn tại");
        }
        var result = await _userFollowRepository.FollowAsync(userId, targetUserId);
        return result;
    }

    public async Task<bool> UnfollowUserAsync(int userId, int targetUserId)
    {
        if (userId == targetUserId)
        {
            throw new ValidationException("Bạn không thể tự unfollow chính mình",
                new[] { "userId and targetUserId must be diffrent." });
        }
        var userExists = await _repository.GetByIdAsync(targetUserId);
        if (userExists is null)
        {
            throw new NotFoundException("User không tồn tại");
        }
        var result = await _userFollowRepository.UnfollowAsync(userId, targetUserId);
        return result;
    }

    public async Task<List<DetailUserFollow>> GetDetailFollowersAsync(int userId, int? userTargetId, Paganation paganation)
    {
        var result = await _repository.GetDetailUserFollowAsync(userId, paganation);
        return result;
    }
}
