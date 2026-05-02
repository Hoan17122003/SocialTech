using System.Text.Json;
using Confluent.Kafka;
using Confluent.Kafka.Admin;
using Microsoft.Extensions.Options;
using SocialBackEnd.Application.Notifications;
using SocialBackEnd.Common.DTOs.Mail;
using SocialBackEnd.Common.Events;

namespace SocialBackEnd.Infrastructure.Kafka;

public sealed class KafkaEventConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaEventConsumer> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public KafkaEventConsumer(
        IServiceScopeFactory serviceScopeFactory,
        IOptions<KafkaOptions> options,
        ILogger<KafkaEventConsumer> logger)
    {
        _serviceScopeFactory = serviceScopeFactory ?? throw new ArgumentNullException(nameof(serviceScopeFactory));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await EnsureTopicsExistAsync(stoppingToken);
        await Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);
    }

    private async Task EnsureTopicsExistAsync(CancellationToken cancellationToken)
    {
        var config = new AdminClientConfig
        {
            BootstrapServers = _options.BootstrapServers
        };

        using var adminClient = new AdminClientBuilder(config).Build();

        try
        {
            await adminClient.CreateTopicsAsync(new[]
            {
                new TopicSpecification
                {
                    Name = _options.Topics.Notification,
                    NumPartitions = 1,
                    ReplicationFactor = 1
                },
                new TopicSpecification
                {
                    Name = _options.Topics.DomainEvents,
                    NumPartitions = 1,
                    ReplicationFactor = 1
                }
            });

            _logger.LogInformation(
                "Kafka topics ensured: {NotificationTopic}, {DomainEventsTopic}",
                _options.Topics.Notification,
                _options.Topics.DomainEvents);
        }
        catch (CreateTopicsException ex) when (ex.Results.All(r => r.Error.Code == ErrorCode.TopicAlreadyExists))
        {
            _logger.LogInformation("Kafka topics already exist.");
        }
        catch (KafkaException ex) when (ex.Error.Code is ErrorCode.Local_TimedOut or ErrorCode.BrokerNotAvailable)
        {
            _logger.LogWarning(ex, "Kafka broker is not ready to create topics yet.");
            await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
            await EnsureTopicsExistAsync(cancellationToken);
        }
    }

    private void ConsumeLoop(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.BootstrapServers))
        {
            _logger.LogWarning("Kafka consumer is disabled because bootstrap servers are missing.");
            return;
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.ConsumerGroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            AllowAutoCreateTopics = true
        };

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(new[]
        {
            _options.Topics.Notification,
            _options.Topics.DomainEvents
        });

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var result = consumer.Consume(stoppingToken);
                if (result?.Message?.Value is null)
                {
                    continue;
                }

                HandleMessageAsync(result.Message.Value, stoppingToken).GetAwaiter().GetResult();
                consumer.Commit(result);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (ConsumeException ex)
            {
                if (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    _logger.LogWarning("Kafka topics are not ready yet. Retrying consume shortly.");
                    Task.Delay(TimeSpan.FromSeconds(2), stoppingToken).GetAwaiter().GetResult();
                    continue;
                }

                _logger.LogError(ex, "Kafka consume error: {Reason}", ex.Error.Reason);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled Kafka consumer error.");
            }
        }

        consumer.Close();
    }

    private async Task HandleMessageAsync(string rawMessage, CancellationToken cancellationToken)
    {
        var envelope = JsonSerializer.Deserialize<IntegrationEventEnvelope>(rawMessage, JsonOptions);
        if (envelope is null)
        {
            throw new InvalidOperationException("Kafka message could not be deserialized.");
        }

        using var scope = _serviceScopeFactory.CreateScope();

        switch (envelope.EventType)
        {
            case nameof(WelcomeEmailRequestedIntegrationEvent):
            {
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                var payload = DeserializePayload<WelcomeEmailRequestedIntegrationEvent>(envelope);
                var model = new WelcomeEmailModel(payload.Username, payload.VerifyLink);
                await emailService.SendEmailAsync(payload.Email, model, cancellationToken);
                break;
            }
            case nameof(ForgetPasswordEmailRequestedIntegrationEvent):
            {
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                var payload = DeserializePayload<ForgetPasswordEmailRequestedIntegrationEvent>(envelope);
                var model = new ForgetPasswordEmailModel(payload.Username, payload.ResetPasswordLink);
                await emailService.SendEmailAsync(payload.Email, model, cancellationToken);
                break;
            }
            case nameof(ArticleCreatedIntegrationEvent):
            {
                var payload = DeserializePayload<ArticleCreatedIntegrationEvent>(envelope);
                _logger.LogInformation(
                    "Handled article-created event for article {ArticleId} by author {AuthorId} with {AttachmentCount} attachments",
                    payload.ArticleId,
                    payload.AuthorId,
                    payload.AttachmentCount);
                break;
            }
            default:
                _logger.LogWarning("Unsupported Kafka event type: {EventType}", envelope.EventType);
                break;
        }
    }

    private static TPayload DeserializePayload<TPayload>(IntegrationEventEnvelope envelope)
    {
        var payload = JsonSerializer.Deserialize<TPayload>(envelope.Payload, JsonOptions);
        return payload ?? throw new InvalidOperationException($"Payload for event {envelope.EventType} is invalid.");
    }
}
