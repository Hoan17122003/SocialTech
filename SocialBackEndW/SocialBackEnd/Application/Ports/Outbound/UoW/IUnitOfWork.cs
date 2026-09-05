
using SocialBackEnd.Application.Ports.Outbound.Repositories;

namespace SocialBackEnd.Application.Ports.Outbound.UoW;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IPostRepository Articles { get; }
    ICommentRepository Comments { get; }
    IAttachmentRepository Attachment { get; }
    ICommentVoteRepository CommentVotes { get; }
    ICommunityMembershipRepository CommunityMemberships { get; }
    ICommunityRepository CommunityRepository { get; }
    IContentReportRepository ContentReports { get; }
    INotificationRepository Notifications { get; }
    IPostMediaAssetRepository PostMediaAsset { get; }
    IPostVoteRepository PostVotes { get; }
    ITagRepository Tag { get; }
    IUserFollowRepository UserFollows { get; }
    IUserLoginRepository UserLogin { get; }
    IChatConversationRepository ChatConversations { get; }
    IChatConverstationParticipantRepository ChatConversationParticipants { get; }

    IOutBoxRepository OutBoxMessages { get; }

    Task BeginTransactionAsync();
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync();
    Task CommitAsync();
}