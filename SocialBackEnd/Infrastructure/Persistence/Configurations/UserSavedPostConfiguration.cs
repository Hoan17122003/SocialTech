using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public class UserSavedPostConfiguration : IEntityTypeConfiguration<UserSavedPost>
{
    public void Configure(EntityTypeBuilder<UserSavedPost> builder)
    {
        builder.ToTable("UserSavedPost");

        builder.HasIndex(x => new { x.UserId, x.PostId })
            .IsUnique();

        builder.HasOne(x => x.User)
            .WithMany(x => x.SavedPosts)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Post)
            .WithMany(x => x.SavedByUsers)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.SavedAtUtc)
            .IsRequired();
    }
}
