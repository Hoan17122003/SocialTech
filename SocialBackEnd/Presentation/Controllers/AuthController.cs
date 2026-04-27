using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Outbound.Security;
using LoginRequest = SocialBackEnd.Common.DTOs.Auth.LoginRequest;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.DTOs.Auth;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserAuthenticationService _authService;
        private readonly ITokenService _tokenService;

        public AuthController(IUserAuthenticationService authService, ITokenService tokenService)
        {
            _authService = authService;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest,
            CancellationToken cancellationToken
        )
        {
            var user = await _authService.ValidateCredentialsAsync(
                loginRequest.Email,
                loginRequest.Password,
                cancellationToken
            );
            if (user is null)
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Message = "Sai tài khoản hoặc mật khẩu",
                    Success = false,
                    Data = null
                });
            }
            var accessToken = _tokenService.CreateAccessToken(user);
            return Ok(new LoginResponse(accessToken, "Bearer", 900));

        }
    }
}
