using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.Models.chat;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IChatConverstationParticipantRepository : IRepository<ChatConversationParticipant>
{
    // Task<string> SetNickNameAsync(
    //     int userId,
    //     RequestSetNickName request,
    //     CancellationToken cancellationToken = default);

}
