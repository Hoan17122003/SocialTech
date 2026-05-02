namespace SocialBackEnd.Infrastructure.Kafka;

public sealed class KafkaTopicOptions
{
    public string Notification { get; set; } = "socialtech.notifications";
    public string DomainEvents { get; set; } = "socialtech.domain-events";
}
