using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Models.chat;

namespace SocialBackEnd.Infrastructure.chat;

[Authorize]
public sealed class ChatHub : Hub
{
    private readonly IChatPort _chatPort;

    public ChatHub(IChatPort chatPort)
    {
        _chatPort = chatPort ?? throw new ArgumentNullException(nameof(chatPort));
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, BuildUserGroupName(userId));
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildUserGroupName(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string BuildUserGroupName(string userId) => $"user:{userId}";

    public static string BuildConversationGroupName(string conversationKey)
        => $"conversation:{conversationKey.Trim()}";

    public Task<IReadOnlyList<ChatConversationSummaryDto>> GetInbox(CancellationToken cancellationToken = default)
    {
        var userId = ParseCurrentUserId();
        return _chatPort.GetInboxAsync(userId, cancellationToken);
    }

    public Task<IReadOnlyList<ChatMessageDto>> GetMessages(
        string conversationKey,
        int take = 50,
        DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default)
    {
        var userId = ParseCurrentUserId();
        return _chatPort.GetMessagesAsync(userId, conversationKey, take, beforeUtc, cancellationToken);
    }

    public async Task<ChatSendResult> SendDirectMessage(
        SendDirectMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = ParseCurrentUserId();
        var result = await _chatPort.SendDirectMessageAsync(userId, request, cancellationToken);
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(result.ConversationKey),
            cancellationToken);
        return result;
    }

    public async Task<ChatSendResult> SendCommunityMessage(
        SendCommunityMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = ParseCurrentUserId();
        var result = await _chatPort.SendCommunityMessageAsync(userId, request, cancellationToken);
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(result.ConversationKey),
            cancellationToken);
        return result;
    }

    public async Task JoinConversation(string conversationKey, CancellationToken cancellationToken = default)
    {
        var userId = ParseCurrentUserId();
        await _chatPort.EnsureConversationAccessAsync(userId, conversationKey, cancellationToken);
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(conversationKey),
            cancellationToken);
    }

    public Task LeaveConversation(string conversationKey, CancellationToken cancellationToken = default)
    {
        return Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(conversationKey),
            cancellationToken);
    }

    private int ParseCurrentUserId()
    {
        if (!int.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("Unauthorized connection.");
        }

        return userId;
    }
}
