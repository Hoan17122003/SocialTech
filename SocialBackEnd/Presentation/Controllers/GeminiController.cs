using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Presentation.Controllers;

[Route("api/ai/gemini")]
[ApiController]
public sealed class GeminiController : ControllerBase
{
    private readonly IGeminiPort _geminiPort;

    public GeminiController(IGeminiPort geminiPort)
    {
        _geminiPort = geminiPort ?? throw new ArgumentNullException(nameof(geminiPort));
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(
        [FromBody] GeminiGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _geminiPort.GenerateAsync(request, cancellationToken);
        return Ok(ApiResponse<GeminiGenerateResponse>.Ok(result));
    }
}
