using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class ChatConversationParticipantConfiguration : IEntityTypeConfiguration<ChatConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ChatConversationParticipant> builder)
    {
        builder.ToTable("ChatConversationParticipants");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.JoinedAtUtc)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired();

        builder.HasIndex(x => new { x.ConversationId, x.UserId })
            .IsUnique();
    }
}
