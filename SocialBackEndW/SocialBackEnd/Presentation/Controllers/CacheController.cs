using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Outbound.cache;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CacheController : ControllerBase
    {

        private readonly ICacheInternal _cacheService;

        public CacheController(ICacheInternal cacheService)
        {
            _cacheService = cacheService;
        }

        [HttpGet("get/{key}")]
        public async Task<IActionResult> GetAllValuesOfKeyPrefix([FromRoute] string key)
        {
            var result = await _cacheService.GetAsync<string>(key);
            return Ok(result);
        }
        [HttpDelete("clear/{keyPrefix}")]
        public async Task<IActionResult> ClearCache([FromRoute] string keyPrefix)
        {
            var result = await _cacheService.ClearAsync(keyPrefix);
            return Ok(result);
        }
    }
}
