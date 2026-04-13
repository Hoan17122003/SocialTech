using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class PostMediaAssetConfiguration : IEntityTypeConfiguration<PostMediaAsset>
{
    public void Configure(EntityTypeBuilder<PostMediaAsset> builder)
    {
        builder.ToTable("PostMediaAssets");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetType)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.StorageUrl)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(x => x.ThumbnailUrl)
            .HasMaxLength(2000);

        builder.Property(x => x.Caption)
            .HasMaxLength(300);

        builder.HasOne(x => x.Post)
            .WithMany(x => x.MediaAssets)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
