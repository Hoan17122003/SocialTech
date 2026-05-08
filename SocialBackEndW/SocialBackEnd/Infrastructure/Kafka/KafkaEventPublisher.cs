using System.Text.Json;
using Confluent.Kafka;
using Microsoft.Extensions.Options;
using SocialBackEnd.Application.Ports.Outbound.Events;
using SocialBackEnd.Common.Events;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Kafka;

public sealed class KafkaEventPublisher : IApplicationEventPublisher, IDisposable
{
    // Kafka producer uses string key/value:
    // - Key is used by Kafka for key-based partitioning.
    // - Value is the JSON integration-event envelope.
    private readonly IProducer<string, string> _producer;
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaEventPublisher> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public KafkaEventPublisher(IOptions<KafkaOptions> options, ILogger<KafkaEventPublisher> logger)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        if (string.IsNullOrWhiteSpace(_options.BootstrapServers))
        {
            throw new InvalidOperationException("Kafka bootstrap servers are not configured.");
        }

        // Acks.All + EnableIdempotence make publishing safer when producer retries.
        var config = new ProducerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            Acks = Acks.All,
            EnableIdempotence = true
        };

        _producer = new ProducerBuilder<string, string>(config).Build();
    }

    public Task PublishWelcomeEmailRequestedAsync(User user, string verifyLink, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(user);

        var payload = new WelcomeEmailRequestedIntegrationEvent(
            user.Email,
            user.Username,
            verifyLink);

        return PublishAsync(_options.Topics.Notification, payload, user.Id.ToString(), cancellationToken);
    }

    public Task PublishForgetPasswordEmailRequestedAsync(User user, string resetPasswordLink, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(user);

        var payload = new ForgetPasswordEmailRequestedIntegrationEvent(
            user.Email,
            user.Username,
            resetPasswordLink);

        return PublishAsync(_options.Topics.Notification, payload, user.Id.ToString(), cancellationToken);
    }

    public Task PublishArticleCreatedAsync(ArticleCreatedIntegrationEvent payload, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(payload);

        return PublishAsync(_options.Topics.DomainEvents, payload, payload.ArticleId.ToString(), cancellationToken);
    }

    private async Task PublishAsync<TPayload>(string topic, TPayload payload, string? key, CancellationToken cancellationToken)
    {
        // Envelope tells consumers the event type and carries the serialized payload.
        var envelope = new IntegrationEventEnvelope(
            typeof(TPayload).Name,
            DateTime.UtcNow,
            key,
            JsonSerializer.Serialize(payload, JsonOptions));

        // The Kafka key controls partition routing when a topic has multiple partitions.
        var message = new Message<string, string>
        {
            Key = key ?? string.Empty,
            Value = JsonSerializer.Serialize(envelope, JsonOptions)
        };

        var result = await _producer.ProduceAsync(topic, message, cancellationToken);
        _logger.LogInformation(
            "Published Kafka event {EventType} to topic {Topic} at offset {Offset}",
            envelope.EventType,
            topic,
            result.Offset.Value);
    }

    public void Dispose()
    {
        _producer.Flush(TimeSpan.FromSeconds(5));
        _producer.Dispose();
    }
}
