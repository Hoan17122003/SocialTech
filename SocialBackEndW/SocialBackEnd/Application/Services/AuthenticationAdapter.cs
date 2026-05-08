using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Application.Ports.Outbound.cache;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Common.Constants;
using SocialBackEnd.Common.DTOs.Auth;
using SocialBackEnd.Common.DTOs.IpLogin;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Application.Services;

public class AuthenticationAdapter : IAuthenticationPort
{
    private readonly IUserAuthenticationService _userAuthenticationService;
    private readonly ITokenService _tokenService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserLoginRepository _ipLoginRepository;
    private readonly ICacheInternal _cacheInternal;
    private readonly IConfiguration _configuration;

    public AuthenticationAdapter(
        IUserAuthenticationService userAuthenticationService,
        ITokenService tokenService,
        IHttpContextAccessor httpContextAccessor,
        IUserLoginRepository ipLoginRepository,
        ICacheInternal cacheInternal,
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
            cancellationToken);

        if (user is null || !int.TryParse(user.UserId, out var userId))
        {
            return new LoginResponse(
                AccessToken: string.Empty,
                TokenType: string.Empty);
        }

        var existingIpLogin = await _ipLoginRepository.GetLatestIpLoginByUserIdAsync(userId, cancellationToken);
        var accessToken = _tokenService.CreateAccessToken(user);

        if (!string.IsNullOrEmpty(existingIpLogin?.RefreshToken))
        {
            return new LoginResponse(
                AccessToken: accessToken,
                TokenType: Constant.PrefixAuth);
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

        return new LoginResponse(
            AccessToken: accessToken,
            TokenType: Constant.PrefixAuth);
    }

    public async Task LogoutAsync(int userId, string accessToken, CancellationToken cancellationToken = default)
    {
        var key = $"blacklist_token:{userId}@{accessToken}";
        var tokenExpirationMinutes = _configuration.GetValue<int>("jwt:AccessTokenMinutes");
        var timeSpan = TimeSpan.FromMinutes(tokenExpirationMinutes);

        await _cacheInternal.SetAsync(key, "true", timeSpan, cancellationToken);
        await _ipLoginRepository.UpdateRefreshTokenAsync(userId, cancellationToken);
    }

    public async Task<ApiResponse<string>> GenerateAccessTokenAsync(
        string accessToken,
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return ApiResponse<string>.Fail("Access token không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return ApiResponse<string>.Fail("Refresh token không tồn tại trong cookie.");
        }

        ClaimsPrincipal accessTokenPrincipal;
        JwtSecurityToken accessJwt;

        try
        {
            accessTokenPrincipal = ValidateToken(accessToken, validateLifetime: false, out accessJwt);
        }
        catch (SecurityTokenException)
        {
            return ApiResponse<string>.Fail("Access token không hợp lệ.");
        }
        catch (ArgumentException)
        {
            return ApiResponse<string>.Fail("Access token không hợp lệ.");
        }

        if (accessJwt.ValidTo > DateTime.UtcNow)
        {
            return ApiResponse<string>.Fail("Access token chưa hết hạn.");
        }

        ClaimsPrincipal refreshTokenPrincipal;

        try
        {
            refreshTokenPrincipal = ValidateToken(refreshToken, validateLifetime: true, out _);
        }
        catch (SecurityTokenException)
        {
            return ApiResponse<string>.Fail("Refresh token không hợp lệ hoặc đã hết hạn.");
        }
        catch (ArgumentException)
        {
            return ApiResponse<string>.Fail("Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        var accessTokenUserId = accessTokenPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
        var refreshTokenUserId = refreshTokenPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(accessTokenUserId, out var userId) ||
            !string.Equals(accessTokenUserId, refreshTokenUserId, StringComparison.Ordinal))
        {
            return ApiResponse<string>.Fail("Token không thuộc cùng một người dùng.");
        }

        var existingIpLogin = await _ipLoginRepository.GetLatestIpLoginByUserIdAsync(userId, cancellationToken);
        if (existingIpLogin is null ||
            string.IsNullOrWhiteSpace(existingIpLogin.RefreshToken) ||
            !string.Equals(existingIpLogin.RefreshToken, refreshToken, StringComparison.Ordinal))
        {
            return ApiResponse<string>.Fail("Refresh token không khớp với phiên đăng nhập hiện tại.");
        }

        var userIdentity = BuildUserIdentity(refreshTokenPrincipal);
        var newAccessToken = _tokenService.CreateAccessToken(userIdentity);

        return ApiResponse<string>.Ok(newAccessToken, "Tạo thành công access token");
    }

    private ClaimsPrincipal ValidateToken(string token, bool validateLifetime, out JwtSecurityToken jwtToken)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var secretKey = _configuration["jwt:SecretKey"]
            ?? throw new InvalidOperationException("Missing jwt:SecretKey configuration.");
        var issuer = _configuration["jwt:Issuer"]
            ?? throw new InvalidOperationException("Missing jwt:Issuer configuration.");
        var audience = _configuration["jwt:Audience"]
            ?? throw new InvalidOperationException("Missing jwt:Audience configuration.");

        var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = validateLifetime,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        }, out var validatedToken);

        jwtToken = validatedToken as JwtSecurityToken
            ?? throw new SecurityTokenException("Invalid JWT token.");

        return principal;
    }

    private static UserIdentity BuildUserIdentity(ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new SecurityTokenException("Missing user id claim.");
        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? throw new SecurityTokenException("Missing email claim.");
        var roles = principal.FindAll(ClaimTypes.Role).Select(x => x.Value).ToArray();
        var permissions = principal.FindAll("permission").Select(x => x.Value).ToArray();

        return new UserIdentity(userId, email, roles, permissions);
    }
}
