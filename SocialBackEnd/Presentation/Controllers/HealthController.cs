using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.DTOs;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<SystemStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await _healthService.GetSystemStatusAsync(cancellationToken);

        return Ok(ApiResponse<SystemStatusDto>.Ok(result, "System status retrieved successfully."));
    }
}
