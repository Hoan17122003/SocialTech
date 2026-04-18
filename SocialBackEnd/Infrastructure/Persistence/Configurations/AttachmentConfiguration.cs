using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachments>
{

    public void Configure(EntityTypeBuilder<Attachments> builder)
    {
        builder.ToTable("Attachments", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Attachments_FileExtension",
                "LOWER(FileExtension) IN ('mp4', 'jpg', 'jpeg')");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.FilePath)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(x => x.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.FileExtension)
            .HasMaxLength(50)
            .IsRequired();


        builder.Property(x => x.FileSize)
            .IsRequired();

        builder.HasOne(x => x.Post)
            .WithMany(x => x.Attachments)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
