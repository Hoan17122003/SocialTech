
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound.notification;

namespace SocialBackEnd.Presentation.Controllers;

public class NotificationController : ControllerBase
{
    private readonly INotification _notificationService;

    public NotificationController(INotification notificationService)
    {
        _notificationService = notificationService;
    }


    [HttpPost("mark-as-read")]
    public async Task<IActionResult> MarkAsRead([FromForm] NotificationMarkAsReadRequest request)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Token không chứa user id hợp lệ.");
        }

        await _notificationService.MarkAsReadAsync(userId, request.NotificationIds, HttpContext.RequestAborted);
        return Ok();
    }

}