namespace SocialBackEnd.Infrastructure.Kafka;

public sealed class KafkaOptions
{
    public const string SectionName = "Kafka";

    public string BootstrapServers { get; set; } = "localhost:9092";
    public string ConsumerGroupId { get; set; } = "socialtech-backend";
    public KafkaTopicOptions Topics { get; set; } = new();
}
