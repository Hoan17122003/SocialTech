using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class ContentReportConfiguration : IEntityTypeConfiguration<ContentReport>
{
    public void Configure(EntityTypeBuilder<ContentReport> builder)
    {
        builder.ToTable("ContentReports");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reason)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Details)
            .HasMaxLength(2000);

        builder.Property(x => x.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired();

        builder.HasIndex(x => new { x.CommunityId, x.Status, x.CreatedAtUtc });

        builder.HasOne(x => x.Community)
            .WithMany(x => x.Reports)
            .HasForeignKey(x => x.CommunityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReporterUser)
            .WithMany(x => x.SubmittedReports)
            .HasForeignKey(x => x.ReporterUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AssignedModerator)
            .WithMany(x => x.AssignedReports)
            .HasForeignKey(x => x.AssignedModeratorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Post)
            .WithMany(x => x.Reports)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Comment)
            .WithMany(x => x.Reports)
            .HasForeignKey(x => x.CommentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
