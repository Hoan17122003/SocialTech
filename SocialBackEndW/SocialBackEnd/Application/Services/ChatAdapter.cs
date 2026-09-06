using Microsoft.AspNetCore.SignalR;
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
using SocialBackEnd.Application.Ports.Outbound.Search;
using Microsoft.Extensions.Logging;

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
    private readonly IChatSearchIndex _chatSearchIndex;
    private readonly IChatMessageSideEffectQueue _chatMessageSideEffectQueue;
    private readonly IChatConversationSummaryBuilder _chatConversationSummaryBuilder;
    private readonly ILogger<ChatAdapter> _logger;

    public ChatAdapter(
        IHubContext<ChatHub> hubContext,
        IUserRepository userRepository,
        IUserFollowRepository userFollowRepository,
        ICommunityRepository communityRepository,
        ICommunityMembershipRepository communityMembershipRepository,
        IChatConversationRepository chatConversationRepository,
        IChatMessageStore chatMessageStore,
        IMinioFileStoragePort minioFileStorage,
        IChatSearchIndex chatSearchIndex,
        IChatMessageSideEffectQueue chatMessageSideEffectQueue,
        IChatConversationSummaryBuilder chatConversationSummaryBuilder,
        ILogger<ChatAdapter> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _userFollowRepository = userFollowRepository ?? throw new ArgumentNullException(nameof(userFollowRepository));
        _communityRepository = communityRepository ?? throw new ArgumentNullException(nameof(communityRepository));
        _communityMembershipRepository = communityMembershipRepository ?? throw new ArgumentNullException(nameof(communityMembershipRepository));
        _chatConversationRepository = chatConversationRepository ?? throw new ArgumentNullException(nameof(chatConversationRepository));
        _chatMessageStore = chatMessageStore ?? throw new ArgumentNullException(nameof(chatMessageStore));
        _minioFileStorage = minioFileStorage ?? throw new ArgumentNullException(nameof(minioFileStorage));
        _chatSearchIndex = chatSearchIndex ?? throw new ArgumentNullException(nameof(chatSearchIndex));
        _chatMessageSideEffectQueue = chatMessageSideEffectQueue ?? throw new ArgumentNullException(nameof(chatMessageSideEffectQueue));
        _chatConversationSummaryBuilder = chatConversationSummaryBuilder ?? throw new ArgumentNullException(nameof(chatConversationSummaryBuilder));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
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
        await QueueSideEffectsAsync(conversation, message, sender.DisplayName, conversationCreated, request.TargetUserId, cancellationToken);

        // Sửa: Tìm participant của người gửi để lấy NickName (nếu có)
        var senderParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == senderUserId);
        var dto = ToMessageDto(message, sender.DisplayName, senderParticipant?.NickName);
        await PublishMessageCreatedAsync(dto, conversation.ConversationKey, cancellationToken);

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
        await QueueSideEffectsAsync(conversation, message, sender.DisplayName, conversationCreated, null, cancellationToken);

        var dto = ToMessageDto(message, sender.DisplayName);
        await _hubContext.Clients
            .Group(ChatHub.BuildConversationGroupName(conversation.ConversationKey))
            .SendAsync("chat.message.created", dto, cancellationToken);

        return new ChatSendResult
        {
            ConversationCreated = conversationCreated,
            ConversationKey = conversation.ConversationKey,
            Message = dto
        };
    }

    public async Task<IReadOnlyList<ConvertstationResultModel>> GetInboxAsync(
        int userId,
        Paganation paganation,
        CancellationToken cancellationToken = default)
    {
        var conversations = await _chatConversationRepository.GetInboxAsync(userId, paganation, cancellationToken);
        conversations = conversations.Select(x => new ConvertstationResultModel
        {
            ConversationKey = x.ConversationKey,
            Kind = x.Kind,
            CommunityId = x.CommunityId,
            LastMessagePreview = x.LastMessagePreview,
            TargetUserId = x.TargetUserId,
            Title = x.Kind == ChatConversationKind.Direct
                    ? (!string.IsNullOrWhiteSpace(x.NickName) ? x.NickName : x.Title)
                    : x.Title,
            NickName = x.NickName,
            HasCustomTitle = x.HasCustomTitle,
            LastMessageAtUtc = x.LastMessageAtUtc
        }).ToList();
        // var results = new List<ChatConversationSummaryDto>(conversations.Count);
        // foreach (var conversation in conversations)
        //     results.Add(await _chatConversationSummaryBuilder.BuildAsync(conversation, userId, cancellationToken));
        return conversations;
    }

    public async Task<ChatConversationSummaryDto> CreateGroupAsync(int creatorUserId, CreateGroupConversationRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var ids = request.ParticipantUserIds.Append(creatorUserId).Distinct().ToArray();
        if (ids.Length < 3) throw new ValidationException("Group chat can it nhat 3 thanh vien.");
        foreach (var id in ids) await RequireUserAsync(id, cancellationToken);

        var conversation = ChatConversation.CreateGroup(ids, creatorUserId, request.Title);
        await _chatConversationRepository.AddAsync(conversation, cancellationToken);
        await _chatConversationRepository.SaveChangesAsync(cancellationToken);
        return await _chatConversationSummaryBuilder.BuildAsync(new ConvertstationResultModel
        {
            ConversationKey = conversation.ConversationKey,
            Kind = conversation.Kind,
            Title = conversation.Title,
            HasCustomTitle = conversation.HasCustomTitle
        }, creatorUserId, cancellationToken);
    }

    public async Task<ChatSendResult> SendGroupMessageAsync(int senderUserId, SendGroupMessageRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(request.Content)) throw new ValidationException("Noi dung tin nhan la bat buoc.");
        await EnsureConversationAccessAsync(senderUserId, request.ConversationKey, cancellationToken);
        var conversation = await _chatConversationRepository.GetByConversationKeyAsync(request.ConversationKey, cancellationToken)
            ?? throw new NotFoundException("Conversation khong ton tai.");
        if (conversation.Kind != ChatConversationKind.Group) throw new ValidationException("Conversation khong phai group chat.");
        var sender = await RequireUserAsync(senderUserId, cancellationToken);
        var message = ChatMessage.Create(conversation.ConversationKey, senderUserId, request.Content, request.ClientMessageId);
        await _chatMessageStore.AppendAsync(message, cancellationToken);
        await QueueSideEffectsAsync(conversation, message, sender.DisplayName, false, null, cancellationToken);
        var senderParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == senderUserId);
        var dto = ToMessageDto(message, sender.DisplayName, senderParticipant?.NickName);
        await _hubContext.Clients.Group(ChatHub.BuildConversationGroupName(conversation.ConversationKey))
            .SendAsync("chat.message.created", dto, cancellationToken);
        return new ChatSendResult { ConversationKey = conversation.ConversationKey, Message = dto };
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

        // Sửa: Lấy danh sách NickName của các thành viên trong cuộc hội thoại để gắn vào message
        var conversation = await _chatConversationRepository.GetByConversationKeyAsync(conversationKey, cancellationToken);
        var participantNickNames = conversation?.Participants
            .Where(p => !string.IsNullOrWhiteSpace(p.NickName))
            .ToDictionary(p => p.UserId, p => p.NickName)
            ?? new Dictionary<int, string?>();

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

            participantNickNames.TryGetValue(message.SenderUserId, out var senderNickName);
            results.Add(ToMessageDto(message, senderName, senderNickName));
        }

        return results;
    }

    public async Task<IReadOnlyList<ChatMessageDto>> SearchMessagesAsync(
        int userId, string conversationKey, string query, int take,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new ValidationException("Tu khoa tim kiem la bat buoc.");
        await EnsureConversationAccessAsync(userId, conversationKey, cancellationToken);
        var messages = await _chatSearchIndex.SearchAsync(conversationKey, query.Trim(), take, cancellationToken);
        var results = new List<ChatMessageDto>(messages.Count);
        foreach (var message in messages)
            results.Add(ToMessageDto(message, (await RequireUserAsync(message.SenderUserId, cancellationToken)).DisplayName));
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

    private Task PublishMessageCreatedAsync(
        ChatMessageDto message,
        string conversationKey,
        CancellationToken cancellationToken)
    {
        return _hubContext.Clients
            .Group(ChatHub.BuildConversationGroupName(conversationKey))
            .SendAsync("chat.message.created", message, cancellationToken);
    }

    private async Task<User> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException($"User {userId} khong ton tai.");
    }

    private async Task QueueSideEffectsAsync(
        ChatConversation conversation,
        ChatMessage message,
        string senderName,
        bool isNewConversation,
        int? directTargetUserId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _chatMessageSideEffectQueue.EnqueueAsync(
                new ChatMessageSideEffectWorkItem(
                    conversation,
                    message,
                    senderName,
                    isNewConversation,
                    directTargetUserId),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Chat side effects could not be queued for conversation {ConversationKey} and message {MessageId}.",
                message.ConversationKey,
                message.MessageId);
        }
    }

    // Sửa: Thêm senderNickName vào ToMessageDto
    private static ChatMessageDto ToMessageDto(ChatMessage message, string senderName, string? senderNickName = null)
    {
        return new ChatMessageDto
        {
            MessageId = message.MessageId.ToString(),
            ConversationKey = message.ConversationKey,
            SenderId = message.SenderUserId.ToString(),
            SenderName = senderName,
            SenderNickName = senderNickName,
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

    public async Task<string> SetNickNameAsync(
        int userId,
        RequestSetNickName request,
        CancellationToken cancellationToken = default)
    {

        var conversation = await _chatConversationRepository.GetByConversationKeyAsync(request.ConversationKey, cancellationToken)
            ?? throw new NotFoundException("Conversation khong ton tai.");

        var isAccessible = conversation.Participants.Any(x => x.UserId == userId);

        if (!isAccessible)
            throw new ValidationException("User khong co quyen truy cap conversation nay.");

        var targetUserId = request.UserIdTarget ?? conversation.Participants.FirstOrDefault(x => x.UserId != userId)?.UserId;

        var userOfTarget = conversation.Participants
            .FirstOrDefault(x => x.UserId == targetUserId);

        if (userOfTarget is null)
            throw new ValidationException("User khong phai thanh vien cua conversation nay.");

        userOfTarget.NickName = request.NickName;

        await _chatConversationRepository.SaveChangesAsync(cancellationToken);

        return userOfTarget.NickName;
    }
}
