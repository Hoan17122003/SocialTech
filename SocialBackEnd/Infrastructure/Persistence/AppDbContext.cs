using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Infrastructure.Persistence.Configurations;

namespace SocialBackEnd.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<SystemStatus> SystemStatuses => Set<SystemStatus>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new SystemStatusConfiguration());
        base.OnModelCreating(modelBuilder);
    }
}
