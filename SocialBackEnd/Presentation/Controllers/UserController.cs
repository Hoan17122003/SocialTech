using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.User;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserPort _userPort;

        public UserController(IUserPort userPort)
        {
            _userPort = userPort ?? throw new ArgumentNullException(nameof(userPort));
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateUser([FromBody] RequestCreateAccount request)
        {
            var result = await _userPort.CreateUserAsync(request);
            return Ok(result);
        }

        [Authorize]
        [HttpPost("profile/{id}")]
        public async Task<IActionResult> GetUserProfile([FromRoute(Name = "id")] int userIdTarget)
        {
            // Khi request đi qua [Authorize], JWT middleware đã validate bearer token
            // và gán claims vào HttpContext.User. Controller chỉ cần đọc lại claims đó.
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<string>.Fail("Token không chứa user id hợp lệ."));
            }

            var result = await _userPort.GetUserProfileAsync(userIdTarget, userId);
            return Ok(ApiResponse<ProfileModelView>.Ok(result, "Success"));
        }

        [Authorize]
        [HttpGet("profile/{id}/detail")]
        public async Task<IActionResult> GetDetailUserFollower([FromRoute(Name = "id")] int userId, [FromQuery] Paganation paganation)
        {
            var result = await _userPort.GetDetailFollowersAsync(userId, paganation);
            return Ok(result);
        }

    }
}
