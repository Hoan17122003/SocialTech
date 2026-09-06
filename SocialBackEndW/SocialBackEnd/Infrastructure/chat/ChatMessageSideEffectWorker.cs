using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound.Chat;
using SocialBackEnd.Application.Ports.Outbound.Search;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.chat;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Infrastructure.chat;

public sealed class ChatMessageSideEffectWorker : BackgroundService
{
    private readonly ChatMessageSideEffectQueue _queue;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<ChatMessageSideEffectWorker> _logger;

    public ChatMessageSideEffectWorker(
        ChatMessageSideEffectQueue queue,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<ChatMessageSideEffectWorker> logger)
    {
        _queue = queue ?? throw new ArgumentNullException(nameof(queue));
        _serviceScopeFactory = serviceScopeFactory ?? throw new ArgumentNullException(nameof(serviceScopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var workItem in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessAsync(workItem, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Chat side effect processing failed for conversation {ConversationKey} and message {MessageId}.",
                    workItem.Message.ConversationKey,
                    workItem.Message.MessageId);
            }
        }
    }

    private async Task ProcessAsync(ChatMessageSideEffectWorkItem workItem, CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var searchIndex = scope.ServiceProvider.GetRequiredService<IChatSearchIndex>();
        var repository = scope.ServiceProvider.GetRequiredService<IChatConversationRepository>();
        var repositoryChatParticipant = scope.ServiceProvider.GetRequiredService<IChatConverstationParticipantRepository>();
        var summaryBuilder = scope.ServiceProvider.GetRequiredService<IChatConversationSummaryBuilder>();
        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ChatHub>>();

        await TryIndexMessageAsync(searchIndex, workItem, cancellationToken);

        var conversation = await PersistConversationAsync(repository, repositoryChatParticipant, workItem, cancellationToken);
        await PublishConversationUpdatesAsync(hubContext, summaryBuilder, conversation, workItem, cancellationToken);
    }

    private async Task TryIndexMessageAsync(
        IChatSearchIndex searchIndex,
        ChatMessageSideEffectWorkItem workItem,
        CancellationToken cancellationToken)
    {
        try
        {
            await searchIndex.IndexAsync(workItem.Message, workItem.SenderName, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Skipping background chat indexing for conversation {ConversationKey} and message {MessageId}.",
                workItem.Message.ConversationKey,
                workItem.Message.MessageId);
        }
    }

    private async Task<ChatConversation> PersistConversationAsync(
        IChatConversationRepository repository,
        IChatConverstationParticipantRepository repositoryChatParticipant,
        ChatMessageSideEffectWorkItem workItem,
        CancellationToken cancellationToken)
    {
        ChatConversation conversation;

        if (workItem.IsNewConversation)
        {
            workItem.Conversation.TouchLastMessage(
                workItem.Message.Content,
                workItem.Message.SenderUserId,
                workItem.Message.SentAtUtc.UtcDateTime);

            try
            {
                await repository.AddAsync(workItem.Conversation, cancellationToken);
                await repository.SaveChangesAsync(cancellationToken);
                conversation = workItem.Conversation;
                // Sửa: Bỏ đoạn tự động add thêm participant thừa ở đây.
                // workItem.Conversation khi khởi tạo qua CreateDirect/CreateGroup đã bao gồm đầy đủ Participants,
                // và repository.AddAsync(workItem.Conversation) ở trên đã tự động lưu toàn bộ participants vào DB.
                // Việc add thêm ở đây gây duplicate row và gán sai NickName = SenderName.
            }
            catch (DbUpdateException)
            {
                conversation = await repository.GetByConversationKeyAsync(workItem.Conversation.ConversationKey, cancellationToken)
                    ?? throw new InvalidOperationException("Conversation could not be loaded after chat metadata persistence failed.");
            }
        }
        else
        {
            conversation = await repository.GetByConversationKeyAsync(workItem.Conversation.ConversationKey, cancellationToken)
                ?? workItem.Conversation;
        }

        conversation.TouchLastMessage(
            workItem.Message.Content,
            workItem.Message.SenderUserId,
            workItem.Message.SentAtUtc.UtcDateTime);

        repository.Update(conversation);
        await repository.SaveChangesAsync(cancellationToken);

        return await repository.GetByConversationKeyAsync(conversation.ConversationKey, cancellationToken)
            ?? conversation;
    }

    private async Task PublishConversationUpdatesAsync(
        IHubContext<ChatHub> hubContext,
        IChatConversationSummaryBuilder summaryBuilder,
        ChatConversation conversation,
        ChatMessageSideEffectWorkItem workItem,
        CancellationToken cancellationToken)
    {
        switch (conversation.Kind)
        {
            case ChatConversationKind.Direct:
                await PublishDirectSummaryAsync(hubContext, summaryBuilder, conversation, workItem, cancellationToken);
                break;
            case ChatConversationKind.Group:
                await PublishGroupSummaryAsync(hubContext, summaryBuilder, conversation, cancellationToken);
                break;
            case ChatConversationKind.Community:
                var summary = await summaryBuilder.BuildAsync(conversation, workItem.Message.SenderUserId, cancellationToken);
                await hubContext.Clients
                    .Group(ChatHub.BuildConversationGroupName(conversation.ConversationKey))
                    .SendAsync("chat.conversation.updated", summary, cancellationToken);
                break;
        }
    }

    private async Task PublishDirectSummaryAsync(
        IHubContext<ChatHub> hubContext,
        IChatConversationSummaryBuilder summaryBuilder,
        ChatConversation conversation,
        ChatMessageSideEffectWorkItem workItem,
        CancellationToken cancellationToken)
    {
        var senderSummary = await summaryBuilder.BuildAsync(conversation, workItem.Message.SenderUserId, cancellationToken);
        await hubContext.Clients
            .Group(ChatHub.BuildUserGroupName(workItem.Message.SenderUserId.ToString()))
            .SendAsync("chat.conversation.updated", senderSummary, cancellationToken);

        if (workItem.DirectTargetUserId.HasValue)
        {
            var targetSummary = await summaryBuilder.BuildAsync(conversation, workItem.DirectTargetUserId.Value, cancellationToken);
            await hubContext.Clients
                .Group(ChatHub.BuildUserGroupName(workItem.DirectTargetUserId.Value.ToString()))
                .SendAsync("chat.conversation.updated", targetSummary, cancellationToken);
        }
    }

    private async Task PublishGroupSummaryAsync(
        IHubContext<ChatHub> hubContext,
        IChatConversationSummaryBuilder summaryBuilder,
        ChatConversation conversation,
        CancellationToken cancellationToken)
    {
        foreach (var participantId in conversation.Participants
                     .Where(x => x.LeftAtUtc == null)
                     .Select(x => x.UserId)
                     .Distinct())
        {
            var summary = await summaryBuilder.BuildAsync(conversation, participantId, cancellationToken);
            await hubContext.Clients
                .Group(ChatHub.BuildUserGroupName(participantId.ToString()))
                .SendAsync("chat.conversation.updated", summary, cancellationToken);
        }
    }
}
