using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs.User;

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
        public Task<IActionResult> CreateUser([FromBody] RequestCreateAccount request)
        {
            var result = _userPort.CreateUserAsync(request);
            if (result == null)
            {
                return Task.FromResult<IActionResult>(BadRequest("User creation failed."));
            }
            return Task.FromResult<IActionResult>(Ok(result));
        }


    }
}
