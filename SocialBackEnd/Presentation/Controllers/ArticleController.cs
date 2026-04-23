using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs.Article;

namespace SocialBackEnd.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ArticleController : ControllerBase
    {
        private readonly IArticlePort _articlePort;

        public ArticleController(IArticlePort articlePort)
        {
            _articlePort = articlePort ?? throw new ArgumentException(nameof(_articlePort));
        }

        [Authorize]
        [HttpPost("create")]
        public async Task<IActionResult> CreateArticle([FromBody] RequestCreateArticle requestCreateArticle)
        {
            return Ok("hehe");
        }

    }
}
