using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.Models.chat;

namespace SocialBackEnd.Infrastructure.chat;

/// <summary>
/// SignalR Hub quản lý các kết nối thời gian thực cho tính năng Chat (Direct Chat & Community Chat).
/// Yêu cầu người dùng phải xác thực (đính kèm JWT access token) trước khi kết nối.
/// </summary>
[Authorize]
public sealed class ChatHub : Hub
{
    private readonly IChatPort _chatPort;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(IChatPort chatPort, ILogger<ChatHub> logger)
    {
        _chatPort = chatPort ?? throw new ArgumentNullException(nameof(chatPort));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Kích hoạt khi có client kết nối thành công.
    /// Tự động thêm connection vào group cá nhân dạng "user:{userId}" để nhận cập nhật hộp thư (Inbox).
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        // Đưa user vào group cá nhân để nhận thông báo real-time dạng cá nhân (ví dụ: cập nhật danh sách inbox)
        await Groups.AddToGroupAsync(Context.ConnectionId, BuildUserGroupName(userId));
        _logger.LogInformation("User {UserId} connected to chat hub with connection {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Kích hoạt khi client ngắt kết nối. 
    /// Dọn dẹp group cá nhân cho connection đó.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildUserGroupName(userId));
        }

        _logger.LogInformation("Connection {ConnectionId} disconnected from chat hub", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Định dạng tên group theo ID người dùng
    public static string BuildUserGroupName(string userId) => $"user:{userId}";

    // Định dạng tên group theo Conversation Key (ví dụ: "conversation:direct:1:3" hoặc "conversation:community:10")
    public static string BuildConversationGroupName(string conversationKey)
        => $"conversation:{conversationKey.Trim()}";

    /// <summary>
    /// Lấy danh sách cuộc hội thoại hiện có của người dùng (Inbox).
    /// </summary>
    public Task<IReadOnlyList<ConvertstationResultModel>> GetInbox()
    {
        var userId = ParseCurrentUserId();
        return _chatPort.GetInboxAsync(userId, new Paganation { Page = 1, Limit = 50 }, Context.ConnectionAborted);
    }

    /// <summary>
    /// Lấy lịch sử tin nhắn của một cuộc hội thoại (lấy từ Cassandra).
    /// </summary>
    public Task<IReadOnlyList<ChatMessageDto>> GetMessages(
        string conversationKey,
        int take = 50,
        DateTimeOffset? beforeUtc = null)
    {
        var userId = ParseCurrentUserId();
        return _chatPort.GetMessagesAsync(userId, conversationKey, take, beforeUtc, Context.ConnectionAborted);
    }

    /// <summary>
    /// Gửi tin nhắn trực tiếp (1-1) giữa hai người dùng follow chéo.
    /// Lưu ý quan trọng: Loại bỏ CancellationToken khỏi tham số phương thức để tránh lỗi SignalR binder mong đợi 2 tham số từ client.
    /// Sử dụng Context.ConnectionAborted để quản lý việc hủy yêu cầu nếu client ngắt kết nối giữa chừng.
    /// </summary>
    public async Task<ChatSendResult> SendDirectMessage(SendDirectMessageRequest request)
    {
        var userId = ParseCurrentUserId();
        
        // 1. Lưu tin nhắn vào Cassandra và cập nhật trạng thái hội thoại trong MySQL
        var result = await _chatPort.SendDirectMessageAsync(userId, request, Context.ConnectionAborted);
        
        // 2. Tham gia group của cuộc hội thoại để nhận các tin nhắn tiếp theo
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(result.ConversationKey),
            Context.ConnectionAborted);
            
        return result;
    }

    /// <summary>
    /// Gửi tin nhắn nhóm (Community Chat).
    /// Yêu cầu người gửi phải là thành viên Active trong nhóm.
    /// </summary>
    public async Task<ChatSendResult> SendCommunityMessage(SendCommunityMessageRequest request)
    {
        var userId = ParseCurrentUserId();
        
        // 1. Lưu tin nhắn vào Cassandra và cập nhật trạng thái hội thoại trong MySQL
        var result = await _chatPort.SendCommunityMessageAsync(userId, request, Context.ConnectionAborted);
        
        // 2. Đưa connection vào group của hội thoại nhóm
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(result.ConversationKey),
            Context.ConnectionAborted);
            
        return result;
    }

    public async Task<ChatSendResult> SendGroupMessage(SendGroupMessageRequest request)
    {
        var result = await _chatPort.SendGroupMessageAsync(ParseCurrentUserId(), request, Context.ConnectionAborted);
        await Groups.AddToGroupAsync(Context.ConnectionId, BuildConversationGroupName(result.ConversationKey), Context.ConnectionAborted);
        return result;
    }

    /// <summary>
    /// Đăng ký lắng nghe sự kiện của một cuộc hội thoại cụ thể (Join vào room SignalR).
    /// </summary>
    public async Task JoinConversation(string conversationKey)
    {
        var userId = ParseCurrentUserId();
        // Kiểm tra quyền truy cập cuộc hội thoại trước khi cho phép join group
        await _chatPort.EnsureConversationAccessAsync(userId, conversationKey, Context.ConnectionAborted);
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(conversationKey),
            Context.ConnectionAborted);
    }

    /// <summary>
    /// Rời khỏi phòng lắng nghe sự kiện của cuộc hội thoại.
    /// </summary>
    public Task LeaveConversation(string conversationKey)
    {
        return Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            BuildConversationGroupName(conversationKey),
            Context.ConnectionAborted);
    }

    // Trích xuất và chuyển đổi UserId từ Context.UserIdentifier sang kiểu int
    private int ParseCurrentUserId()
    {
        if (!int.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("Unauthorized connection.");
        }

        return userId;
    }
}
