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
    // Consumer chạy như hosted background service, nên cần IServiceScopeFactory
    // để tạo scope mới mỗi lần xử lý message và resolve service scoped như email service.
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
        // Trước khi consume, đảm bảo các topic cần dùng đã tồn tại trong Kafka.
        await EnsureTopicsExistAsync(stoppingToken);

        // ConsumeLoop là vòng lặp blocking, nên chạy trong Task riêng để không chặn async pipeline.
        await Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);
    }

    private async Task EnsureTopicsExistAsync(CancellationToken cancellationToken)
    {
        // AdminClient dùng cho thao tác quản trị Kafka như tạo topic.
        var config = new AdminClientConfig
        {
            BootstrapServers = _options.BootstrapServers
        };

        using var adminClient = new AdminClientBuilder(config).Build();

        try
        {
            // Tạo các topic nếu chưa tồn tại.
            // Notification đang có 1 partition vì luồng gửi email thường chỉ cần xử lý tuần tự.
            // DomainEvents có 3 partition để có thể scale consumer theo partition.
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
                    NumPartitions = 3,
                    ReplicationFactor = 1
                },

            });

            // Nếu tạo topic thành công, ghi log tên topic để dễ kiểm tra khi app start.
            _logger.LogInformation(
                "Kafka topics ensured: {NotificationTopic}, {DomainEventsTopic}",
                _options.Topics.Notification,
                _options.Topics.DomainEvents);
        }
        catch (CreateTopicsException ex) when (ex.Results.All(r => r.Error.Code == ErrorCode.TopicAlreadyExists))
        {
            // Kafka trả lỗi TopicAlreadyExists khi topic đã có sẵn; trường hợp này không phải lỗi runtime.
            _logger.LogInformation("Kafka topics already exist.");
        }
        catch (KafkaException ex) when (ex.Error.Code is ErrorCode.Local_TimedOut or ErrorCode.BrokerNotAvailable)
        {
            // Khi app start trước Kafka broker, chờ một chút rồi thử tạo topic lại.
            _logger.LogWarning(ex, "Kafka broker is not ready to create topics yet.");
            await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
            await EnsureTopicsExistAsync(cancellationToken);
        }
    }

    private void ConsumeLoop(CancellationToken stoppingToken)
    {
        // Không có bootstrap server thì consumer không thể kết nối Kafka.
        if (string.IsNullOrWhiteSpace(_options.BootstrapServers))
        {
            _logger.LogWarning("Kafka consumer is disabled because bootstrap servers are missing.");
            return;
        }

        // GroupId xác định consumer group.
        // Các instance cùng group sẽ chia nhau partition của các topic đã subscribe.
        // EnableAutoCommit=false để chỉ commit offset sau khi xử lý message thành công.
        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.ConsumerGroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            AllowAutoCreateTopics = true
        };

        using var consumer = new ConsumerBuilder<string, string>(config).Build();

        // Subscribe cả hai topic: notification events và domain events.
        consumer.Subscribe(new[]
        {
            _options.Topics.Notification,
            _options.Topics.DomainEvents
        });

        // Vòng lặp chính: liên tục đọc message cho tới khi app shutdown.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Consume sẽ block cho tới khi có message mới hoặc cancellation token được kích hoạt.
                var result = consumer.Consume(stoppingToken);
                if (result?.Message?.Value is null)
                {
                    continue;
                }

                // Chỉ commit offset sau khi handler chạy xong để tránh mất message khi xử lý lỗi.
                HandleMessageAsync(result.Message.Value, stoppingToken).GetAwaiter().GetResult();
                consumer.Commit(result);
            }
            catch (OperationCanceledException)
            {
                // App đang shutdown, thoát loop một cách bình thường.
                break;
            }
            catch (ConsumeException ex)
            {
                if (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    // Topic có thể chưa sẵn sàng ngay lúc consumer bắt đầu subscribe.
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

        // Close giúp consumer rời group gọn gàng và commit/cleanup trạng thái nội bộ.
        consumer.Close();
    }

    private async Task HandleMessageAsync(string rawMessage, CancellationToken cancellationToken)
    {
        // Message value là JSON của IntegrationEventEnvelope do producer tạo.
        var envelope = JsonSerializer.Deserialize<IntegrationEventEnvelope>(rawMessage, JsonOptions);
        if (envelope is null)
        {
            throw new InvalidOperationException("Kafka message could not be deserialized.");
        }

        // Tạo scope mới cho mỗi message để lấy dependency scoped đúng vòng đời.
        using var scope = _serviceScopeFactory.CreateScope();

        // Dispatch theo EventType trong envelope để gọi handler tương ứng.
        switch (envelope.EventType)
        {
            case nameof(WelcomeEmailRequestedIntegrationEvent):
                {
                    // Event yêu cầu gửi email chào mừng/xác thực tài khoản.
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                    var payload = DeserializePayload<WelcomeEmailRequestedIntegrationEvent>(envelope);
                    var model = new WelcomeEmailModel(payload.Username, payload.VerifyLink);
                    await emailService.SendEmailAsync(payload.Email, model, cancellationToken);
                    break;
                }
            case nameof(ForgetPasswordEmailRequestedIntegrationEvent):
                {
                    // Event yêu cầu gửi email đặt lại mật khẩu.
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                    var payload = DeserializePayload<ForgetPasswordEmailRequestedIntegrationEvent>(envelope);
                    var model = new ForgetPasswordEmailModel(payload.Username, payload.ResetPasswordLink);
                    await emailService.SendEmailAsync(payload.Email, model, cancellationToken);
                    break;
                }
            case nameof(ArticleCreatedIntegrationEvent):
                {
                    // Event domain khi bài viết được tạo; hiện tại mới log, có thể mở rộng handler sau.
                    var payload = DeserializePayload<ArticleCreatedIntegrationEvent>(envelope);
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                    var model = new NotificationArticleCreate
                    {
                        Title = payload.Title,
                        SubContent = payload.SubContent,
                        Thumbnail = payload.Thumbnail,
                        LinkArticle = payload.LinkArticle,
                        LinkProfileAuthor = payload.LinkProfileAuthor,
                        NameAuthor = payload.NameAuthor,
                        AvatarAuthor = payload.AvatarAuthor,
                        CreateDate = payload.CreateDate
                    };

                    foreach (var emailUserFollow in payload.EmailUserFollow)
                    {
                        await emailService.SendEmailAsync(emailUserFollow, model, cancellationToken);
                    }

                    _logger.LogInformation(
                        "Handled article-created event for article {ArticleId} by author {AuthorId} with attachments",
                        payload.ArticleId,
                        payload.AuthorId);
                    break;
                }
            default:
                _logger.LogWarning("Unsupported Kafka event type: {EventType}", envelope.EventType);
                break;
        }
    }

    private static TPayload DeserializePayload<TPayload>(IntegrationEventEnvelope envelope)
    {
        // Payload trong envelope là JSON string; deserialize về đúng event contract cần xử lý.
        var payload = JsonSerializer.Deserialize<TPayload>(envelope.Payload, JsonOptions);
        return payload ?? throw new InvalidOperationException($"Payload for event {envelope.EventType} is invalid.");
    }
}
