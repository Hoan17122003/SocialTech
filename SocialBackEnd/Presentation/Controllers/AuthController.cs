using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Outbound.Security;
using LoginRequest = SocialBackEnd.Common.DTOs.Auth.LoginRequest;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.DTOs.Auth;
using SocialBackEnd.Application.Ports.Inbound.web;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using SocialBackEnd.Common.Constants;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {

        private readonly IAuthenticationPort _authenticationPort;

        public AuthController(IAuthenticationPort authenticationPort)
        {
            _authenticationPort = authenticationPort ?? throw new ArgumentNullException(nameof(authenticationPort));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest,
            CancellationToken cancellationToken
        )
        {
            var authResult = await _authenticationPort.LoginAsync(
                loginRequest,
                cancellationToken
            );
            if (string.IsNullOrEmpty(authResult.AccessToken))
            {
                return Unauthorized(new { Message = "Invalid email or password" });
            }
            return Ok(authResult);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // Xóa cookie refresh token
            Response.Cookies.Delete("refreshToken");
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var authorizationHeader = HttpContext.Request.Headers.Authorization.ToString();
            string accessToken = null;
            if (authorizationHeader.StartsWith($"{Constant.PrefixAuth} ", StringComparison.OrdinalIgnoreCase))
            {
                accessToken = authorizationHeader[Constant.PrefixAuth.Length..].Trim();
            }
            if (!int.TryParse(userIdClaim, out int userId))
            {
                return BadRequest(new { Message = "Invalid user ID" });
            }
            // update lại refresh token trong database thành rỗng
            await _authenticationPort.LogoutAsync(userId, accessToken);
            return Ok(new { Message = "Logged out successfully" });
        }

        [HttpPost("accessToken-generate")]
        [AllowAnonymous]
        public async Task<IActionResult> GenerateAccessTokenAsyc(CancellationToken cancellationToken)
        {
            var authorizationHeader = HttpContext.Request.Headers.Authorization.ToString();
            string accessToken = string.Empty;

            if (authorizationHeader.StartsWith($"{Constant.PrefixAuth} ", StringComparison.OrdinalIgnoreCase))
            {
                accessToken = authorizationHeader[Constant.PrefixAuth.Length..].Trim();
            }

            Request.Cookies.TryGetValue("refreshToken", out var refreshToken);

            var result = await _authenticationPort.GenerateAccessTokenAsync(
                accessToken,
                refreshToken ?? string.Empty,
                cancellationToken);

            if (!result.Success)
            {
                return Unauthorized(result);
            }

            return Ok(result);
        }
    }
}
