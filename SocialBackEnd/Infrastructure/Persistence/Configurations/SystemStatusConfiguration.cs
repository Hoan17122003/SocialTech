using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class SystemStatusConfiguration : IEntityTypeConfiguration<SystemStatus>
{
    public void Configure(EntityTypeBuilder<SystemStatus> builder)
    {
        builder.ToTable("SystemStatuses");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .ValueGeneratedNever();

        builder.Property(x => x.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(x => x.Version)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Environment)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.UtcTime)
            .IsRequired();

        builder.HasData(new SystemStatus
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "SocialBackEnd",
            Version = "v1",
            Environment = "Seed",
            UtcTime = new DateTime(2026, 4, 9, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
