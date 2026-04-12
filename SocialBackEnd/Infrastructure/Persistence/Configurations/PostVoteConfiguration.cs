using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class PostVoteConfiguration : IEntityTypeConfiguration<PostVote>
{
    public void Configure(EntityTypeBuilder<PostVote> builder)
    {
        builder.ToTable("PostVotes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.VoteType)
            .HasConversion<int>()
            .IsRequired();

        builder.HasIndex(x => new { x.PostId, x.UserId })
            .IsUnique();

        builder.HasOne(x => x.Post)
            .WithMany(x => x.Votes)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(x => x.PostVotes)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
