using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class UserFollowConfiguration : IEntityTypeConfiguration<UserFollow>
{
    public void Configure(EntityTypeBuilder<UserFollow> builder)
    {
        builder.ToTable("UserFollows");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Follower)
            .WithMany(x => x.Followings)
            .HasForeignKey(x => x.FollowerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Following)
            .WithMany(x => x.Followers)
            .HasForeignKey(x => x.FollowingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.FollowerId, x.FollowingId })
            .IsUnique();

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired();
    }
}
