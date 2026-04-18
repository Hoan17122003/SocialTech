using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<SystemStatus> SystemStatuses => Set<SystemStatus>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Community> Communities => Set<Community>();
    public DbSet<CommunityMembership> CommunityMemberships => Set<CommunityMembership>();
    public DbSet<CommunityRule> CommunityRules => Set<CommunityRule>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostMediaAsset> PostMediaAssets => Set<PostMediaAsset>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<PostTag> PostTags => Set<PostTag>();
    public DbSet<PostVote> PostVotes => Set<PostVote>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentVote> CommentVotes => Set<CommentVote>();
    public DbSet<ContentReport> ContentReports => Set<ContentReport>();
    public DbSet<IPLogin> IPLogins => Set<IPLogin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
