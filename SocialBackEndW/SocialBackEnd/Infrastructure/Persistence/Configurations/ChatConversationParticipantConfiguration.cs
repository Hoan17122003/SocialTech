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

        builder.Property(x => x.ConversationId)
            .IsRequired();
        
        builder.Property(x => x.UserId)
            .IsRequired();
        
        builder.Property(x => x.NickName)
            .IsRequired(false)
            .HasMaxLength(20);

        builder.Property(x => x.JoinedAtUtc)
            .IsRequired();
        
        builder.Property(x => x.LeftAtUtc)
            .IsRequired(false);

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired();
        


        builder.HasIndex(x => new { x.ConversationId, x.UserId })
            .IsUnique();
        
        builder.HasOne(x => x.Conversation)
            .WithMany(x => x.Participants)
            .HasForeignKey(x => x.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(x => x.User)
            .WithMany(x => x.ChatConversations)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
