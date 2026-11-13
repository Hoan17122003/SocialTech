using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations
{
    public sealed class ReactTypeConfiguration : IEntityTypeConfiguration<ReactType>
    {
        public void Configure(EntityTypeBuilder<ReactType> builder)
        {
            builder.ToTable("ReactTypes");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Type)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(x => x.Type);

        }
    }
}
