namespace SocialBackEnd.Infrastructure.Kafka;

// Nhóm tên topic Kafka để cấu hình tập trung và tránh hard-code ở nhiều nơi.
public sealed class KafkaTopicOptions
{
    // Topic dành cho các event cần gửi notification/email.
    public string Notification { get; set; } = "socialtech.notifications";

    // Topic dành cho các domain event phát sinh từ nghiệp vụ chính.
    public string DomainEvents { get; set; } = "socialtech.domain-events";

    public string ArticleCreate { set; get; } = "socialTech.article-create-event";
    public string CommentCreate { set; get; } = "socialTech.comment-create-event";
}