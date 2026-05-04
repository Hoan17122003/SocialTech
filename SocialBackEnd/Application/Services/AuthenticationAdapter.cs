using System.Configuration;
using Org.BouncyCastle.Asn1.Cms;
using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Common.DTOs.Auth;
using SocialBackEnd.Common.DTOs.IpLogin;
using SocialBackEnd.Infrastructure.Persistence.Repositories;
using SocialBackEnd.Common.Constants;

namespace SocialBackEnd.Application.Services;

public class AuthenticationAdapter : IAuthenticationPort
{
    private readonly IUserAuthenticationService _userAuthenticationService;

    private readonly ITokenService _tokenService;

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserLoginRepository _ipLoginRepository;
    private readonly ICacheInternal _cacheInternal;
    private readonly IConfiguration _configuration;


    public AuthenticationAdapter(IUserAuthenticationService userAuthenticationService,
    ITokenService tokenService, IHttpContextAccessor httpContextAccessor,
    IUserLoginRepository ipLoginRepository, ICacheInternal cacheInternal,
    IConfiguration configuration)
    {
        _userAuthenticationService = userAuthenticationService;
        _tokenService = tokenService;
        _httpContextAccessor = httpContextAccessor;
        _ipLoginRepository = ipLoginRepository ?? throw new ArgumentNullException(nameof(ipLoginRepository));
        _cacheInternal = cacheInternal ?? throw new ArgumentNullException(nameof(cacheInternal));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userAuthenticationService.ValidateCredentialsAsync(
                request.Email,
                request.Password,
                cancellationToken
        );
        if (user is null || !int.TryParse(user.UserId, out var userId))
        {
            return new LoginResponse
            (
                AccessToken: string.Empty,
                TokenType: string.Empty
            );
        }
        var existingIpLogin = await _ipLoginRepository.GetLatestIpLoginByUserIdAsync(userId, cancellationToken);
        var accessToken = _tokenService.CreateAccessToken(user);
        if (!string.IsNullOrEmpty(existingIpLogin?.RefreshToken))
        {
            return new LoginResponse
            (
                AccessToken: accessToken,
                TokenType: Constant.PrefixAuth
            );
        }

        var refreshToken = _tokenService.CreateRefreshToken(user);
        var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        await _ipLoginRepository.CreateIpLoginAsync(new RequestIpLogin
        {
            UserId = userId,
            RefreshToken = refreshToken,
            IpAddress = ipAddress
        });
        _httpContextAccessor.HttpContext?.Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(1)
        });

        return new LoginResponse
        (
            AccessToken: accessToken,
            TokenType: Constant.PrefixAuth
        );
    }

    public async Task LogoutAsync(int userId, string accessToken, CancellationToken cancellationToken = default)
    {
        var key = $"blacklist_token:{userId}@{accessToken}";
        var tokenExpirationMinutes = _configuration.GetValue<int>("jwt:AccessTokenMinutes");
        var timeSpan = TimeSpan.FromMinutes(tokenExpirationMinutes);
        await _cacheInternal.SetAsync(key, "true", timeSpan, cancellationToken);
        // Update lại RefreshToken thành rỗng để đăng xuất
        await _ipLoginRepository.UpdateRefreshTokenAsync(userId, cancellationToken);
    }
}