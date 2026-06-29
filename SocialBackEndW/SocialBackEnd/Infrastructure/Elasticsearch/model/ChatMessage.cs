using Nest;

//  Dùng attribute [ElasticsearchType] để map với index
[ElasticsearchType(RelationName = "chat_message")]
public class ChatMessageElasitcsearch
{
    // Elasticsearch sẽ dùng property này làm _id của document
    [Text(Name = "id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Keyword(Name = "conversation_id")]  // Keyword để lọc chính xác
    public string ConversationId { get; set; } = string.Empty;

    [Keyword(Name = "sender_id")]
    public string SenderId { get; set; } = string.Empty;

    [Text(Name = "sender_name", Analyzer = "standard")]
    public string SenderName { get; set; } = string.Empty;

    // Field quan trọng nhất cho search
    [Text(Name = "content", Analyzer = "standard")]
    public string Content { get; set; } = string.Empty;

    [Date(Name = "created_at", Format = "yyyy-MM-dd HH:mm:ss||epoch_millis")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Boolean(Name = "is_deleted")]
    public bool IsDeleted { get; set; }

    // Nested object - ví dụ lưu thông tin file đính kèm
    [Nested(Name = "attachments")]
    public List<Attachment>? Attachments { get; set; }
}

// Class phụ cho attachment (nếu có)
public class AttachmentElasticsearch
{
    [Text(Name = "file_name")]
    public string FileName { get; set; } = string.Empty;

    [Keyword(Name = "file_type")]
    public string FileType { get; set; } = string.Empty;

    [Number(Name = "file_size")]
    public long FileSize { get; set; }
}