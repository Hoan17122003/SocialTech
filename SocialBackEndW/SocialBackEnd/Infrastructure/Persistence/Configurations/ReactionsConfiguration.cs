using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackend.Domain.Entities;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations
{
    public sealed class ReactionsConfiguration : IEntityTypeConfiguration<Reactions>
    {

        public void Configure(EntityTypeBuilder<Reactions> builder)
        {
            builder.ToTable("Reactions");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId)
                .IsRequired(true);
            

            builder.Property(x => x.PostId)
                .IsRequired(true);

            builder.Property(x => x.ReactEnums) 
                .IsRequired(false)
                .HasDefaultValue(null);

            builder.Property(x => x.ReactTypeId)
                .IsRequired(true);

            // Ràng buộc CHECK: đảm bảo cả 3 cột phải khác null
            builder.HasCheckConstraint(
                "CK_Reactions_User_Post_ReactType",
                "`UserId` IS NOT NULL AND `PostId` IS NOT NULL AND `ReactTypeId` IS NOT NULL"
            );

            builder.HasOne(x => x.User)
                .WithMany(x => x.Reactions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Post)
                .WithMany(x => x.Reactions)
                .HasForeignKey(x => x.PostId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.React)
                .WithMany(x => x.Reactions)
                .HasForeignKey(x => x.ReactTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
