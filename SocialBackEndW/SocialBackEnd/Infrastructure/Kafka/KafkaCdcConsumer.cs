using Confluent.Kafka;
using Microsoft.AspNetCore.Server.IIS;
using Microsoft.Extensions.Options;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Infrastructure.Kafka;
using SocialBackEnd.Infrastructure.Storage;
using System.Text;
using System.Text.Json;

public sealed class KafkaCdcConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaCdcConsumer> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public KafkaCdcConsumer(
        IServiceScopeFactory scopeFactory,
        ILogger<KafkaCdcConsumer> logger,
        IOptions<KafkaOptions> kafkaOptions
        )
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = kafkaOptions?.Value ?? throw new ArgumentNullException(nameof(kafkaOptions));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);
    }

    private void ConsumeLoop(CancellationToken stoppingToken)
    {
        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.ConsumerGroupId + "_Debezium",

            // Nếu consumer group mới thì đọc từ đầu
            AutoOffsetReset = AutoOffsetReset.Earliest,

            // Chỉ commit sau khi xử lý business thành công
            EnableAutoCommit = false,

            // Tránh consumer bị xem là dead khi đang xử lý message lâu
            EnablePartitionEof = false
        };

        using var consumer = new ConsumerBuilder<string, string>(config)
                                .Build();
        consumer.Subscribe(_options.Topics.DebeziumCdc);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(stoppingToken);

                    if (result?.Message is null)
                    {
                        continue;
                    }

                    _logger.LogInformation(
                        "Received Debezium Outbox event. " +
                        "Topic={Topic}, Partition={Partition}, Offset={Offset}",
                        result.Topic,
                        result.Partition,
                        result.Offset);

                    // Quan trọng:
                    // truyền toàn bộ ConsumeResult xuống handler
                    HandleDebeziumMessage(result, stoppingToken)
                        .GetAwaiter()
                        .GetResult();

                    // Chỉ commit SAU KHI handler xử lý thành công
                    consumer.Commit(result);

                    _logger.LogInformation(
                        "Debezium event committed. " +
                        "Topic={Topic}, Partition={Partition}, Offset={Offset}",
                        result.Topic,
                        result.Partition,
                        result.Offset);
                }
                catch (OperationCanceledException)
                {
                    break;
                }

                // Topic chưa tồn tại
                catch (ConsumeException ex)
                    when (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    _logger.LogWarning("Topic '{Topic}' chưa tồn tại.Đang chờ Debezium tạo topic...", _options.Topics.DebeziumCdc);
                    Thread.Sleep(5000);
                }

                // Kafka consume error
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, $"Kafka Consume error. Reason={ex.Error.Reason}");
                    Thread.Sleep(2000);
                }

                // Business / deserialization / infrastructure error
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing Debezium event.");
                    Thread.Sleep(2000);
                }
            }
        }
        finally
        {
            consumer.Close();
        }
    }

    private async Task HandleDebeziumMessage(ConsumeResult<string, string> message, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Payload from Outbox Event Router
            var payload = message.Message.Value;

            // 2. Get metadata from Kafka headers
            var outboxMessageId = GetHeader(message.Message.Headers, "outboxMessageId");

            var eventType = GetHeader(message.Message.Headers, "eventType");

            if (!int.TryParse(outboxMessageId, out var outboxId))
            {
                _logger.LogError("Invalid outboxMessageId: {OutboxMessageId}", outboxMessageId);
                return;
            }

            if (string.IsNullOrWhiteSpace(eventType))
            {
                _logger.LogError("Missing eventType for OutboxMessageId: {OutboxMessageId}", outboxId);
                return;
            }

            // 3. AggregateType from topic

            // example:
            // topic = social_service.User
            // => AggregateType = User

            var aggregateType = message.Topic
                .Replace("social_service.", "");

            _logger.LogInformation("Outbox event received. OutboxId={OutboxId}, AggregateType={AggregateType}, EventType={EventType}, payload = {payload}",
                outboxId,
                aggregateType,
                eventType,
                payload
            );

            // 4. handle business event

            using var scope = _scopeFactory.CreateScope();

            var handler = scope.ServiceProvider
                .GetRequiredService<IMigrationsStorageFileHandler>();

            await handler.HandlerAsync(aggregateType, eventType, DateTime.UtcNow, payload);

            // 5. Mark Outbox as processed
            var outboxRepository = scope.ServiceProvider
                .GetRequiredService<IOutBoxRepository>();

            await outboxRepository.MarkAsProcessedAsync(outboxId);

            _logger.LogInformation("Outbox event processed successfully. OutboxId={OutboxId}", outboxId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Debezium Outbox message");
            throw;
        }
    }

    //helper
    private static string? GetHeader(Headers headers, string key)
    {
        var header = headers.LastOrDefault(x => x.Key == key);

        if (header == null)
        {
            return null;
        }

        return Encoding.UTF8.GetString(header.GetValueBytes());
    }

}