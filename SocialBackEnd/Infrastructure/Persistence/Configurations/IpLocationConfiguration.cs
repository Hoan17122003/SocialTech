using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public class IpLoginConfiguration : IEntityTypeConfiguration<IPLogin>
{
    public void Configure(EntityTypeBuilder<IPLogin> builder)
    {
        builder.ToTable("IPlogin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RefreshToken)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.IpAddress)
            .HasMaxLength(20)
            .IsRequired();

        builder.HasOne(x => x.UserLogin)
            .WithMany(x => x.IPLogins)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
