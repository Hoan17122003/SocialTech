using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Inbound.Chat;
using SocialBackEnd.Application.Ports.Outbound.Chat;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.Minio;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;
using SocialBackEnd.Infrastructure.chat;
using SocialBackEnd.Common.DTOs;

namespace SocialBackEnd.Application.Services;

public sealed class ChatAdapter : IChatPort
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IUserRepository _userRepository;
    private readonly IUserFollowRepository _userFollowRepository;
    private readonly ICommunityRepository _communityRepository;
    private readonly ICommunityMembershipRepository _communityMembershipRepository;
    private readonly IChatConversationRepository _chatConversationRepository;
    private readonly IChatMessageStore _chatMessageStore;
    private readonly IMinioFileStoragePort _minioFileStorage;

    public ChatAdapter(
        IHubContext<ChatHub> hubContext,
        IUserRepository userRepository,
        IUserFollowRepository userFollowRepository,
        ICommunityRepository communityRepository,
        ICommunityMembershipRepository communityMembershipRepository,
        IChatConversationRepository chatConversationRepository,
        IChatMessageStore chatMessageStore,
        IMinioFileStoragePort minioFileStorage)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _userFollowRepository = userFollowRepository ?? throw new ArgumentNullException(nameof(userFollowRepository));
        _communityRepository = communityRepository ?? throw new ArgumentNullException(nameof(communityRepository));
        _communityMembershipRepository = communityMembershipRepository ?? throw new ArgumentNullException(nameof(communityMembershipRepository));
        _chatConversationRepository = chatConversationRepository ?? throw new ArgumentNullException(nameof(chatConversationRepository));
        _chatMessageStore = chatMessageStore ?? throw new ArgumentNullException(nameof(chatMessageStore));
        _minioFileStorage = minioFileStorage ?? throw new ArgumentNullException(nameof(minioFileStorage));
    }

    public async Task<ChatSendResult> SendDirectMessageAsync(
        int senderUserId,
        SendDirectMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (senderUserId == request.TargetUserId)
        {
            throw new ValidationException("Khong the tao direct chat voi chinh minh.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            throw new ValidationException("Noi dung tin nhan la bat buoc.");
        }

        var sender = await RequireUserAsync(senderUserId, cancellationToken);
        await RequireUserAsync(request.TargetUserId, cancellationToken);

        var senderFollowsTarget = await _userFollowRepository.IsFollowingAsync(
            senderUserId,
            request.TargetUserId,
            cancellationToken);
        var targetFollowsSender = await _userFollowRepository.IsFollowingAsync(
            request.TargetUserId,
            senderUserId,
            cancellationToken);

        if (!senderFollowsTarget || !targetFollowsSender)
        {
            throw new ValidationException("Chat user-user chi hop le khi hai ben da follow nhau.");
        }

        var conversation = await _chatConversationRepository.GetDirectConversationAsync(
            senderUserId,
            request.TargetUserId,
            cancellationToken);
        var conversationCreated = conversation is null;
        conversation ??= ChatConversation.CreateDirect(senderUserId, request.TargetUserId, senderUserId);

        /*
         * =================================================================================
         * GIẢI THÍCH VỀ CƠ CHẾ IDEMPOTENCY TRONG DIRECT CHAT (TRÁNH TRÙNG LẶP TIN NHẮN)
         * =================================================================================
         * - Tại sao cần: Khi frontend gửi tin nhắn qua SignalR/HTTP, nếu gặp sự cố mạng làm thất lạc
         *   gói tin phản hồi, frontend sẽ tự động gửi lại (retry) tin nhắn đó.
         * - Cơ chế Idempotency ở đây hoạt động như thế nào:
         *   1. Mỗi tin nhắn mới được frontend gán một `ClientMessageId` duy nhất (dạng UUID).
         *   2. Khi retry gửi lại tin nhắn bị lỗi, frontend bắt buộc giữ nguyên `ClientMessageId` này.
         *   3. Backend nhận `ClientMessageId` từ request và lưu trực tiếp vào Cassandra.
         * - Thực trạng dự án: Hiện tại backend CHƯA thực hiện check trùng lặp theo `ClientMessageId`.
         *   Mỗi lượt gọi hàm này sẽ tạo mới `MessageId` (Guid.NewGuid()) và `SentAtUtc` rồi append 
         *   vào Cassandra, dẫn tới ghi trùng nhiều dòng tin nhắn trong DB và phát đi nhiều event Websocket.
         * - Hướng giải quyết đề xuất:
         *   Trước khi lưu, kiểm tra xem `ClientMessageId` đã tồn tại trong Redis cache hoặc Cassandra chưa.
         *   Nếu có rồi, chỉ trả về tin nhắn cũ mà không lưu mới hay broadcast lại (Idempotency Guard).
         * =================================================================================
         */
        var message = ChatMessage.Create(
            conversation.ConversationKey,
            senderUserId,
            request.Content,
            request.ClientMessageId);

        await _chatMessageStore.AppendAsync(message, cancellationToken);
        await PersistConversationAsync(conversation, message, conversationCreated, cancellationToken);

        var dto = ToMessageDto(message, sender.DisplayName);
        var summary = ToConversationSummary(conversation, senderUserId);
        await PublishConversationEventsAsync(
            dto,
            summary,
            conversation.ConversationKey,
            senderUserId,
            request.TargetUserId,
            cancellationToken);

        return new ChatSendResult
        {
            ConversationCreated = conversationCreated,
            ConversationKey = conversation.ConversationKey,
            Message = dto
        };
    }

    public async Task<ChatSendResult> SendCommunityMessageAsync(
        int senderUserId,
        SendCommunityMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            throw new ValidationException("Noi dung tin nhan la bat buoc.");
        }

        var sender = await RequireUserAsync(senderUserId, cancellationToken);
        var community = await _communityRepository.GetByIdAsync(request.CommunityId, cancellationToken)
            ?? throw new NotFoundException("Community khong ton tai.");

        var membership = await _communityMembershipRepository.GetByCommunityAndUserAsync(
            request.CommunityId,
            senderUserId,
            cancellationToken);

        if (membership is null || membership.Status != CommunityMemberStatus.Active)
        {
            throw new ValidationException("Chi thanh vien da duoc add vao group moi duoc chat.");
        }

        var conversation = await _chatConversationRepository.GetCommunityConversationAsync(
            request.CommunityId,
            cancellationToken);
        var conversationCreated = conversation is null;
        conversation ??= ChatConversation.CreateCommunity(request.CommunityId, senderUserId, community.Name);

        /*
         * =================================================================================
         * GIẢI THÍCH VỀ CƠ CHẾ IDEMPOTENCY TRONG COMMUNITY CHAT (TRÁNH TRÙNG LẶP TIN NHẮN)
         * =================================================================================
         * - Tại sao cần: Khi frontend gửi tin nhắn qua SignalR/HTTP, nếu gặp sự cố mạng làm thất lạc
         *   gói tin phản hồi, frontend sẽ tự động gửi lại (retry) tin nhắn đó.
         * - Cơ chế Idempotency ở đây hoạt động như thế nào:
         *   1. Mỗi tin nhắn mới được frontend gán một `ClientMessageId` duy nhất (dạng UUID).
         *   2. Khi retry gửi lại tin nhắn bị lỗi, frontend bắt buộc giữ nguyên `ClientMessageId` này.
         *   3. Backend nhận `ClientMessageId` từ request và lưu trực tiếp vào Cassandra.
         * - Thực trạng dự án: Hiện tại backend CHƯA thực hiện check trùng lặp theo `ClientMessageId`.
         *   Mỗi lượt gọi hàm này sẽ tạo mới `MessageId` (Guid.NewGuid()) và `SentAtUtc` rồi append 
         *   vào Cassandra, dẫn tới ghi trùng nhiều dòng tin nhắn trong DB và phát đi nhiều event Websocket.
         * - Hướng giải quyết đề xuất:
         *   Trước khi lưu, kiểm tra xem `ClientMessageId` đã tồn tại trong Redis cache hoặc Cassandra chưa.
         *   Nếu có rồi, chỉ trả về tin nhắn cũ mà không lưu mới hay broadcast lại (Idempotency Guard).
         * =================================================================================
         */
        var message = ChatMessage.Create(
            conversation.ConversationKey,
            senderUserId,
            request.Content,
            request.ClientMessageId);

        await _chatMessageStore.AppendAsync(message, cancellationToken);
        await PersistConversationAsync(conversation, message, conversationCreated, cancellationToken);

        var dto = ToMessageDto(message, sender.DisplayName);
        var summary = ToConversationSummary(conversation, senderUserId);
        await _hubContext.Clients
            .Group(ChatHub.BuildConversationGroupName(conversation.ConversationKey))
            .SendAsync("chat.message.created", dto, cancellationToken);
        await _hubContext.Clients
            .Group(ChatHub.BuildConversationGroupName(conversation.ConversationKey))
            .SendAsync("chat.conversation.updated", summary, cancellationToken);

        return new ChatSendResult
        {
            ConversationCreated = conversationCreated,
            ConversationKey = conversation.ConversationKey,
            Message = dto
        };
    }

    public async Task<IReadOnlyList<ChatConversationSummaryDto>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default)
    {
        var conversations = await _chatConversationRepository.GetInboxAsync(userId, paganation, cancellationToken);
        return conversations
            .Select(x => ToConversationSummary(x, userId))
            .ToList();
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        int userId,
        string conversationKey,
        int take,
        DateTimeOffset? beforeUtc = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureConversationAccessAsync(userId, conversationKey, cancellationToken);

        var messages = await _chatMessageStore.GetLatestAsync(
            conversationKey,
            take,
            beforeUtc,
            cancellationToken);

        var senderNames = new Dictionary<int, string>();
        var results = new List<ChatMessageDto>(messages.Count);

        foreach (var message in messages.OrderBy(x => x.SentAtUtc))
        {
            if (!senderNames.TryGetValue(message.SenderUserId, out var senderName))
            {
                var sender = await RequireUserAsync(message.SenderUserId, cancellationToken);
                senderName = sender.DisplayName;
                senderNames[message.SenderUserId] = senderName;
            }

            results.Add(ToMessageDto(message, senderName));
        }

        return results;
    }

    public async Task EnsureConversationAccessAsync(
        int userId,
        string conversationKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(conversationKey))
        {
            throw new ValidationException("Conversation key la bat buoc.");
        }

        var canAccess = await _chatConversationRepository.CanAccessAsync(
            conversationKey.Trim(),
            userId,
            cancellationToken);

        if (!canAccess)
        {
            throw new ValidationException("User khong co quyen truy cap conversation nay.");
        }
    }

    private async Task PersistConversationAsync(
        ChatConversation conversation,
        ChatMessage message,
        bool isNewConversation,
        CancellationToken cancellationToken)
    {
        conversation.TouchLastMessage(message.Content, message.SenderUserId, message.SentAtUtc.UtcDateTime);

        if (isNewConversation)
        {
            await _chatConversationRepository.AddAsync(conversation, cancellationToken);
        }
        else
        {
            _chatConversationRepository.Update(conversation);
        }

        try
        {
            await _chatConversationRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (isNewConversation)
        {
            var existing = await _chatConversationRepository.GetByConversationKeyAsync(
                conversation.ConversationKey,
                cancellationToken);

            if (existing is null)
            {
                throw;
            }

            existing.TouchLastMessage(message.Content, message.SenderUserId, message.SentAtUtc.UtcDateTime);
            _chatConversationRepository.Update(existing);
            await _chatConversationRepository.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task PublishConversationEventsAsync(
        ChatMessageDto message,
        ChatConversationSummaryDto summary,
        string conversationKey,
        int senderUserId,
        int targetUserId,
        CancellationToken cancellationToken)
    {
        await _hubContext.Clients
            .Group(ChatHub.BuildConversationGroupName(conversationKey))
            .SendAsync("chat.message.created", message, cancellationToken);

        await _hubContext.Clients
            .Group(ChatHub.BuildUserGroupName(senderUserId.ToString()))
            .SendAsync("chat.conversation.updated", summary, cancellationToken);

        await _hubContext.Clients
            .Group(ChatHub.BuildUserGroupName(targetUserId.ToString()))
            .SendAsync("chat.conversation.updated", summary, cancellationToken);
    }

    private async Task<User> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException($"User {userId} khong ton tai.");
    }

    private static ChatConversationSummaryDto ToConversationSummary(ChatConversation conversation, int currentUserId)
    {
        return new ChatConversationSummaryDto
        {
            ConversationKey = conversation.ConversationKey,
            ConversationType = conversation.Kind.ToString(),
            OtherUserId = conversation.Kind == ChatConversationKind.Direct
                ? (conversation.DirectUserLowId == currentUserId
                    ? conversation.DirectUserHighId
                    : conversation.DirectUserLowId)
                : null,
            CommunityId = conversation.CommunityId,
            Title = conversation.Title,
            LastMessagePreview = conversation.LastMessagePreview,
            LastMessageAtUtc = conversation.LastMessageAtUtc.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(conversation.LastMessageAtUtc.Value, DateTimeKind.Utc))
                : null
        };
    }

    private static ChatMessageDto ToMessageDto(ChatMessage message, string senderName)
    {
        return new ChatMessageDto
        {
            MessageId = message.MessageId.ToString(),
            ConversationKey = message.ConversationKey,
            SenderId = message.SenderUserId.ToString(),
            SenderName = senderName,
            Content = message.Content,
            SentAtUtc = message.SentAtUtc,
            IsEdited = message.State == ChatMessageState.Edited,
            IsDeleted = message.State == ChatMessageState.Deleted
        };
    }

    public async Task<IReadOnlyList<DetailUserFollow>> SearchCandidatesAsync(
        int userId,
        string query,
        CancellationToken cancellationToken = default)
    {
        var users = await _userFollowRepository.SearchTwoWayFollowersAsync(userId, query, cancellationToken);
        var results = new List<DetailUserFollow>(users.Count);

        foreach (var user in users)
        {
            var avatarUrl = string.IsNullOrEmpty(user.ProfileImageUrl)
                ? string.Empty
                : await _minioFileStorage.GetPresignedUrlAsync(user.ProfileImageUrl);

            results.Add(new DetailUserFollow(
                user.Id,
                avatarUrl,
                user.DisplayName
            ));
        }

        return results;
    }
}
