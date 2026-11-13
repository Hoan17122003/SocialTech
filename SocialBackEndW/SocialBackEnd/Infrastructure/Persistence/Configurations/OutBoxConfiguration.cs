using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Persistence.Configurations;

public sealed class OutBoxConfiguration : IEntityTypeConfiguration<OutBoxMessage>
{
    public void Configure(EntityTypeBuilder<OutBoxMessage> builder)
    {
        // Primary Key
        builder.HasKey(x => x.Id);

        // Aggregate Metadata
        builder.Property(x => x.AggregateType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.AggregateId)
            .IsRequired();

        // Event Type (Tên đầy đủ của Class Event, ví dụ: UserCreatedDomainEvent)
        builder.Property(x => x.EventType)
            .HasMaxLength(100)
            .IsRequired();

        // Payload dữ liệu (Lưu dưới dạng JSON)
        builder.Property(x => x.Payload)
            .IsRequired(); // Trong SQL Server sẽ map thành nvarchar(max) hoặc jsonb trong Postgres

        // Thời gian xử lý xong (Null nếu chưa xử lý)
        builder.Property(x => x.ProcessedOnUtc)
            .IsRequired(false)
            .HasDefaultValue(null);

        // Lưu thông tin lỗi nếu publish thất bại (để Retry hoặc Debug)
        builder.Property(x => x.Error)
            .IsRequired(false)
            .HasDefaultValue(null);


        // Index này giúp Background Job tìm nhanh các message chưa xử lý (ProcessedOnUtc IS NULL)
        // xếp theo thứ tự thời gian tạo (CreatedAtUtc)
        builder.HasIndex(x => new { x.ProcessedOnUtc, x.CreatedAtUtc });

        builder.HasIndex(x => x.AggregateType);
        builder.HasIndex(x => x.EventType);

    }
}
