using System.Security.Claims;
using Microsoft.AspNetCore.Http;
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
        [HttpPost("profile/{id}")]
        public async Task<IActionResult> GetUserProfile([FromRoute] int userIdTarget)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var result = await _userPort.GetUserProfileAsync(userIdTarget, userId);
            return Ok(ApiResponse<ProfileModelView>.Ok(result, "Success"));
        }

        [HttpGet("profile/{id}/detail")]
        public async Task<IActionResult> GetDetailUserFollower([FromRoute(Name = "id")] int userId, [FromQuery] Paganation paganation)
        {
            var result = await _userPort.GetDetailFollowersAsync(userId, paganation);
            return Ok(result);
        }

    }
}
