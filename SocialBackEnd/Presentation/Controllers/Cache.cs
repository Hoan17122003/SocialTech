using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Outbound.cache;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Cache : ControllerBase
    {

        private readonly ICacheInternal _cacheService;

        public Cache(ICacheInternal cacheService)
        {
            _cacheService = cacheService;
        }

        [HttpPost("get")]
        public async Task<IActionResult> GetAllValuesOfKeyPrefix([FromRoute] string key)
        {
            var result = await _cacheService.GetAsync<string>(key);
            return Ok(result);
        }
        [HttpPost("clear")]
        public async Task<IActionResult> ClearCache([FromRoute] string keyPrefix)
        {
            var result = await _cacheService.ClearAsync(keyPrefix);
            return Ok(result);
        }
    }
}
