namespace SocialBackEnd.Infrastructure.Kafka;

// Class này map với section "Kafka" trong appsettings.json.
public sealed class KafkaOptions
{
    public const string SectionName = "Kafka";

    // Danh sách Kafka broker mà producer/consumer sẽ kết nối tới.
    public string BootstrapServers { get; set; } = "localhost:9092";

    // Consumer group quyết định cách các consumer instance chia partition với nhau.
    public string ConsumerGroupId { get; set; } = "socialtech-backend";

    // Tên các topic Kafka được ứng dụng sử dụng.
    public KafkaTopicOptions Topics { get; set; } = new();
}
