using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models;

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

        public async Task<IActionResult> GetUserProfile([FromQuery] int userId)
        {
            var result = await _userPort.GetUserProfileAsync(userId);
            return Ok(result);
        }



        }
    }
