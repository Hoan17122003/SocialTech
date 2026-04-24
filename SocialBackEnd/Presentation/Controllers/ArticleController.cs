using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.Models;

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
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Token không chứa user id hợp lệ.");
            }
            var result = await _articlePort.CreateArticle(requestCreateArticle, userId);
            return Ok(ApiResponse<int>.Ok(result, "Tạo bài viết thành công"));
        }
        [Authorize]
        [HttpPut("update/{articleId:int}")]
        public async Task<IActionResult> UpdateArticle([FromRoute] int articleId, [FromBody] RequestUpdateArticle requestUpdateArticle)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Token không chứa user id hợp lệ.");
            }
            var result = await _articlePort.UpdateArticle(requestUpdateArticle, articleId, userId);
            if (result)
            {
                return Ok(ApiResponse<string>.Ok("Cập nhật bài viết thành công", "Success"));
            }
            else
            {
                return BadRequest(ApiResponse<string>.Fail("Cập nhật bài viết thất bại"));
            }
        }

        [Authorize]
        [HttpDelete("delete/{articleId:int}")]
        public async Task<IActionResult> DeleteArticle([FromRoute] int articleId)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Token không chứa user id hợp lệ.");
            }
            var result = await _articlePort.DeleteArticle(articleId, userId);
            if (result)
            {
                return Ok(ApiResponse<string>.Ok("Xóa bài viết thành công", "Success"));
            }
            else
            {
                return BadRequest(ApiResponse<string>.Fail("Xóa bài viết thất bại"));
            }
        }

    }
}
