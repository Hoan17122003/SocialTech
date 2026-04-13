using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class CommunityRuleConfiguration : IEntityTypeConfiguration<CommunityRule>
{
    public void Configure(EntityTypeBuilder<CommunityRule> builder)
    {
        builder.ToTable("CommunityRules");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.HasOne(x => x.Community)
            .WithMany(x => x.Rules)
            .HasForeignKey(x => x.CommunityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
