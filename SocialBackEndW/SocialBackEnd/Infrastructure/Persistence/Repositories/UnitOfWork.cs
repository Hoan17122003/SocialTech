
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore.Storage;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Application.Ports.Outbound.UoW;

namespace SocialBackEnd.Infrastructure.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork, IDisposable
{
    private AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public IUserRepository? Users { get; }
    public IPostRepository? Articles { get; }
    public ICommentRepository? Comments { get; }
    public IAttachmentRepository? Attachment { get; }
    public ICommentVoteRepository? CommentVotes { get; }
    public ICommunityMembershipRepository? CommunityMemberships { get; }
    public ICommunityRepository? CommunityRepository { get; }
    public IContentReportRepository? ContentReports { get; }
    public INotificationRepository? Notifications { get; }
    public IPostMediaAssetRepository? PostMediaAsset { get; }
    public IPostVoteRepository? PostVotes { get; }
    public ITagRepository? Tag { get; }
    public IUserFollowRepository? UserFollows { get; }
    public IUserLoginRepository? UserLogin { get; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Users = new UserRepository(_context);
        Articles = new PostRepository(_context);
        Comments = new CommentRepository(_context);
        Attachment = new AttachmentRepository(_context);
        CommentVotes = new CommentVoteRepository(_context);
        CommunityMemberships = new CommunityMembershipRepository(_context);
        CommunityRepository = new CommunityRepository(_context);
        ContentReports = new ContentReportRepository(_context);
        Notifications = new NotificationRepository(_context);
        PostMediaAsset = new PostMediaAssetRepository(_context);
        PostVotes = new PostVoteRepository(_context);
        Tag = new TagRepository(_context);
        UserFollows = new UserFollowRepository(_context);
        UserLogin = new IpLoginRepository(_context);
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => await _context.SaveChangesAsync(cancellationToken);

    public async Task RollbackAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task CommitAsync()
    {
        try
        {
            await _context.SaveChangesAsync();
            if (_transaction != null)
            {
                await _transaction.CommitAsync();
            }
        }
        catch
        {
            await RollbackAsync();
            throw;
        }
        finally
        {
            if (_transaction != null)
            {
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}