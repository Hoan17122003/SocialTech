using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.DTOs.Chat;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.chat;

namespace SocialBackEnd.Presentation.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public sealed class ChatController : ControllerBase
{
    private readonly IChatPort _chatPort;

    public ChatController(IChatPort chatPort)
    {
        _chatPort = chatPort ?? throw new ArgumentNullException(nameof(chatPort));
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox([FromQuery] Paganation paganation, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Token khong chua user id hop le."));
        }

        var result = await _chatPort.GetInboxAsync(userId, paganation, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ChatConversationSummaryDto>>.Ok(result));
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(
        [FromQuery] string conversationKey,
        [FromQuery] int take = 50,
        [FromQuery] DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Token khong chua user id hop le."));
        }

        var result = await _chatPort.GetMessagesAsync(userId, conversationKey, take, beforeUtc, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ChatMessageDto>>.Ok(result));
    }

    [HttpPost("direct/send")]
    public async Task<IActionResult> SendDirectMessage(
        [FromBody] SendDirectMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Token khong chua user id hop le."));
        }

        var result = await _chatPort.SendDirectMessageAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<ChatSendResult>.Ok(result));
    }

    [HttpPost("community/send")]
    public async Task<IActionResult> SendCommunityMessage(
        [FromBody] SendCommunityMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Token khong chua user id hop le."));
        }

        var result = await _chatPort.SendCommunityMessageAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<ChatSendResult>.Ok(result));
    }

    [HttpGet("candidates")]
    public async Task<IActionResult> GetCandidates([FromQuery] string? query, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Token khong chua user id hop le."));
        }

        var result = await _chatPort.SearchCandidatesAsync(userId, query ?? "", cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DetailUserFollow>>.Ok(result));
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out userId);
    }

    [HttpPut("message/edit")]
    public async Task<IActionResult> EditMessage([FromBody] EditMessageRequest request)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Token không chứa user id hợp lệ.");
        }
        return Ok();
    }

    [HttpDelete("message/delete/${messageId:int}")]
    public async Task<IActionResult> DeleteMessage([FromRoute] int messageId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Token không chứa user id hợp lệ.");
        }
        return Ok();
    }
}
