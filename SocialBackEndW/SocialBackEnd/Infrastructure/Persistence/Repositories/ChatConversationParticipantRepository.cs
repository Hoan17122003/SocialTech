
using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Persistence;
using SocialBackEnd.Infrastructure.Persistence.Repositories;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public class ChatConversationParticipantRepository : RepositoryBase<ChatConversationParticipant>, IChatConverstationParticipantRepository
{
    public ChatConversationParticipantRepository(AppDbContext dbContext) : base(dbContext)
    {
    }

    // public async Task<string> SetNickNameAsync(
    //     int userId,
    //     ,
    //     CancellationToken cancellationToken = default)
    // {
    //     var participant = await DbContext
    //         .ChatConversationParticipants
    //         .FirstOrDefaultAsync(x => x.ConversationId == request.ConversationId && x.UserId == userId, cancellationToken);

    //     if (participant is null)
    //         throw new InvalidOperationException("User is not a participant of the conversation.");

    //     participant.NickName = request.NickName;
    //     await DbContext.SaveChangesAsync(cancellationToken);

    //     return participant.NickName;
    // }
}