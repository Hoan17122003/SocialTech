using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class CommentVoteConfiguration : IEntityTypeConfiguration<CommentVote>
{
    public void Configure(EntityTypeBuilder<CommentVote> builder)
    {
        builder.ToTable("CommentVotes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.VoteType)
            .HasConversion<int>()
            .IsRequired();

        builder.HasIndex(x => new { x.CommentId, x.UserId })
            .IsUnique();

        builder.HasOne(x => x.Comment)
            .WithMany(x => x.Votes)
            .HasForeignKey(x => x.CommentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(x => x.CommentVotes)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
