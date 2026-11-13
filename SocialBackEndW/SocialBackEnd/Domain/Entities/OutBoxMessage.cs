
namespace SocialBackEnd.Domain.Entities;

public class OutBoxMessage : EntityBase
{
    public string AggregateType { get; set; } = default!; // "Post,..."
    public int AggregateId { get; set; }    // Post.Id
    public string EventType { get; set; } = default!;     // "OrderCreated"
    public string Payload { get; set; } = default!;        // JSON string
    public DateTime? ProcessedOnUtc { get; set; } = null; // Null nếu chưa xử lý
    public string? Error { get; set; } = string.Empty;
}