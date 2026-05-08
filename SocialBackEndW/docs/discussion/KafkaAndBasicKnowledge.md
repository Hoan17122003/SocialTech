# Kafka And Basic Knowledge

Tài liệu này gom lại các kiến thức đã trao đổi trong quá trình làm flow `ArticleCreated`, Kafka publisher/consumer, `async/await`, background processing và Outbox Pattern. Mục tiêu là giúp bạn hiểu rõ vì sao code nên được tách thành các lớp, khi nào nên `await`, khi nào nên đẩy xử lý sang background, và cách tránh các lỗi hiệu năng như lazy loading implicit hoặc N+1 query.

> Ghi chú: một số ví dụ code được viết theo style gần với codebase `SocialBackEnd` hiện tại, không phải framework tổng quát.

## 1. Kafka Là Gì?

Kafka là một distributed event streaming platform. Hiểu đơn giản: Kafka là nơi các service/app gửi message vào, và các service/app khác đọc message ra để xử lý.

Ví dụ trong project:

```text
ArticleAdapterPort tạo bài viết
KafkaEventPublisher gửi ArticleCreatedIntegrationEvent vào Kafka
KafkaEventConsumer đọc event từ Kafka
EmailNotificationService gửi email cho follower
```

Kafka giúp tách rời các tác vụ:

```text
Tạo bài viết không cần gọi trực tiếp gửi email.
Gửi email có thể xử lý bất đồng bộ.
Sau này có thể thêm consumer khác: search indexing, recommendation, analytics.
```

## 2. Các Khái Niệm Nên Nắm

### 2.1 Topic

Topic là kênh message. Mỗi loại event nên vào một topic phù hợp.

Ví dụ:

```csharp
public sealed class KafkaTopicOptions
{
    // Topic dành cho notification/email event.
    public string Notification { get; set; } = "socialtech.notifications";

    // Topic dành cho domain event như article-created.
    public string DomainEvents { get; set; } = "socialtech.domain-events";
}
```

### 2.2 Producer

Producer là bên gửi message vào Kafka.

Trong codebase:

```csharp
public sealed class KafkaEventPublisher : IApplicationEventPublisher, IDisposable
{
    private readonly IProducer<string, string> _producer;

    public Task PublishArticleCreatedAsync(
        ArticleCreatedIntegrationEvent payload,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(payload);

        // ArticleId được dùng làm key để các event của cùng article đi vào cùng partition.
        return PublishAsync(
            _options.Topics.DomainEvents,
            payload,
            payload.ArticleId.ToString(),
            cancellationToken);
    }
}
```

### 2.3 Consumer

Consumer là bên đọc message từ Kafka.

Trong codebase:

```csharp
using var consumer = new ConsumerBuilder<string, string>(config).Build();

consumer.Subscribe(new[]
{
    _options.Topics.Notification,
    _options.Topics.DomainEvents
});
```

Consumer đọc message, deserialize event, rồi gọi handler tương ứng.

### 2.4 Partition

Một topic có thể có nhiều partition. Partition giúp Kafka scale đọc/ghi song song.

Ví dụ:

```csharp
new TopicSpecification
{
    Name = _options.Topics.DomainEvents,
    NumPartitions = 3,
    ReplicationFactor = 1
}
```

Nếu topic có 3 partition, Kafka có thể chia việc cho tối đa khoảng 3 consumer active trong cùng một consumer group.

```text
1 partition  -> tối đa 1 consumer active cho topic đó
3 partitions -> tối đa 3 consumer active cho topic đó
6 partitions -> tối đa 6 consumer active cho topic đó
```

### 2.5 Message Key Và Key-Based Partitioning

Khi producer gửi message có `Key`, Kafka dùng key để quyết định partition.

```csharp
var message = new Message<string, string>
{
    Key = key ?? string.Empty,
    Value = JsonSerializer.Serialize(envelope, JsonOptions)
};
```

Ý nghĩa:

```text
Cùng key -> thường vào cùng partition -> giữ thứ tự xử lý theo key đó.
```

Ví dụ:

```text
ArticleId = 10 -> partition 1
ArticleId = 10 -> partition 1
ArticleId = 11 -> partition 2
ArticleId = 12 -> partition 0
```

Dùng key nào tùy business:

```text
user.Id: giữ thứ tự event theo từng user
post.Id/article.Id: giữ thứ tự event theo từng bài viết
community.Id: gom event theo từng community
```

## 3. Producer Config: Acks Và Idempotence

Trong producer hiện tại:

```csharp
var config = new ProducerConfig
{
    BootstrapServers = _options.BootstrapServers,
    Acks = Acks.All,
    EnableIdempotence = true
};
```

### Acks.All

`Acks.All` nghĩa là producer đợi broker xác nhận message đã được ghi an toàn hơn.

Ưu điểm:

```text
Tăng độ tin cậy.
Giảm nguy cơ message bị mất khi broker gặp lỗi.
```

Nhược điểm:

```text
Latency cao hơn Acks.None hoặc Acks.Leader.
```

### EnableIdempotence

`EnableIdempotence = true` giúp producer tránh ghi trùng message trong một số trường hợp retry.

Ưu điểm:

```text
Publish an toàn hơn khi network lỗi tạm thời.
Phù hợp với event quan trọng.
```

Nhược điểm:

```text
Cần config producer đúng chuẩn.
Latency có thể cao hơn một chút.
```

## 4. Vì Sao Không Nên Lazy Loading Implicit Trong Publisher?

Bạn từng có ý tưởng lấy dữ liệu như sau trong `KafkaEventPublisher`:

```csharp
var thumbnail = post.Attachments.Select(x => x.FilePath).First();

var emailUserFollow = post.Author.Followers
    .Select(x => x.Follower.Email)
    .ToList();
```

Nếu dùng lazy loading implicit, các navigation property có thể gây ra nhiều query ngầm:

```text
1 query lấy Post
1 query lazy load Attachments
1 query lazy load Author
1 query lazy load Author.Followers
N query lazy load từng Follower để lấy Email
```

Đây là vấn đề N+1 query.

Rủi ro khác:

```text
Publisher đang là messaging infrastructure nhưng lại phụ thuộc EF navigation.
DbContext có thể đã dispose.
Query ngầm khó debug.
Latency publish Kafka bị phụ thuộc database.
Dễ gây lỗi runtime khi entity detached.
```

Hướng tốt hơn là query projection trong repository.

## 5. Projection Query Trong Repository

Projection nghĩa là query đúng những dữ liệu cần thiết và map thẳng sang DTO/event.

Ví dụ:

```csharp
public Task<ArticleCreatedIntegrationEvent?> GetArticleCreatedEventAsync(
    int postId,
    CancellationToken cancellationToken = default)
{
    return DbContext.Posts
        .AsNoTracking()
        .Where(post => post.Id == postId)
        .Select(post => new ArticleCreatedIntegrationEvent
        {
            ArticleId = post.Id,
            AuthorId = post.AuthorId,
            NameAuthor = post.Author.DisplayName,
            AvatarAuthor = post.Author.ProfileImageUrl ?? string.Empty,
            Title = post.Title,
            CommunityId = post.CommunityId,
            LinkArticle = $"{Constant.PrefixArticle}/{post.Id}",
            Thumbnail = post.Attachments
                .OrderBy(attachment => attachment.Id)
                .Select(attachment => attachment.FilePath)
                .FirstOrDefault() ?? string.Empty,
            SubContent = post.Body ?? string.Empty,
            EmailUserFollow = post.Author.Followers
                .Select(userFollow => userFollow.Follower.Email)
                .ToList(),
            CreateDate = post.CreatedAtUtc
        })
        .FirstOrDefaultAsync(cancellationToken);
}
```

Ưu điểm:

```text
Không cần lazy loading.
Query rõ ràng.
Lấy đúng dữ liệu cần cho Kafka event.
Publisher không cần biết EF relationship.
Dễ test và dễ debug hơn.
```

Nhược điểm:

```text
Repository có thêm method riêng cho use case.
Cần cân nhắc DTO/event nào được phép nằm ở tầng nào.
Projection phức tạp có thể cần tách thành query service nếu lớn dần.
```

## 6. Flow Hiện Tại Sau Khi Tách Projection

Flow tạo article nên đi như sau:

```text
Client -> ArticleController.CreateArticle
ArticleController -> ArticleAdapterPort.CreateArticle
ArticleAdapterPort validate content bằng Gemini
ArticleAdapterPort save Post
ArticleAdapterPort save Attachments
ArticleAdapterPort query ArticleCreatedIntegrationEvent từ repository
ArticleAdapterPort gọi KafkaEventPublisher
KafkaEventPublisher serialize payload và publish vào Kafka
KafkaEventConsumer consume event
KafkaEventConsumer map sang NotificationArticleCreate
EmailNotificationService gửi email cho follower
KafkaEventConsumer commit offset
```

Code service:

```csharp
var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);
if (articleCreatedEvent is not null)
{
    await _applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
}

return articleEntity.Id;
```

## 7. Async/Await Có Chặn Thread Không?

Đây là điểm rất dễ nhầm.

```csharp
await _applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
```

`await` không chặn thread theo kiểu synchronous blocking. Nó không giống:

```csharp
task.Wait();
var result = task.Result;
Thread.Sleep(1000);
```

Khi gặp `await`, thread có thể được trả về thread pool để xử lý việc khác. Khi task hoàn thành, continuation được lên lịch chạy tiếp.

Nhưng `await` vẫn làm business flow phải chờ.

```text
Thread không bị block nặng.
Nhưng HTTP request vẫn chưa return cho client.
```

Nói ngắn gọn:

```text
await không block thread, nhưng await làm method hiện tại chờ kết quả async trước khi chạy tiếp.
```

## 8. Vì Sao Không Nên Bỏ Await Trực Tiếp?

Không nên làm như sau:

```csharp
_applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
return articleEntity.Id;
```

Đây là fire-and-forget.

Rủi ro:

```text
Exception có thể bị mất hoặc không log đúng.
Kafka fail nhưng request vẫn báo thành công.
App shutdown giữa chừng có thể mất task.
Không có retry.
Không biết message đã vào Kafka hay chưa.
Dependency scoped có thể bị dispose nếu task dùng về sau.
```

Nếu muốn gửi ngầm, hãy dùng background queue hoặc Outbox Pattern.

## 9. Best Choice 1: Await Trực Tiếp

### Luồng

```text
Client gọi API CreateArticle
API validate
API save Post
API save Attachments
API query event data
API await publish Kafka
Kafka xác nhận
API return articleId
```

### Code

```csharp
var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);
if (articleCreatedEvent is not null)
{
    // Chờ Kafka broker xác nhận producer publish xong.
    await _applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
}

return articleEntity.Id;
```

### Mục đích

Đảm bảo khi API trả success thì event đã được publish thành công vào Kafka.

### Ưu điểm

```text
Đơn giản nhất.
Ít code nhất.
Exception rõ ràng.
Dễ debug.
Không cần thêm queue/table/background worker.
Phù hợp MVP hoặc flow cần xác nhận publish.
```

### Nhược điểm

```text
API phải chờ Kafka.
Kafka chậm thì API chậm.
Kafka down có thể ảnh hưởng create article.
Request flow bị coupling với messaging infrastructure.
```

### Khi nên dùng

```text
Project mới.
Cần tính đơn giản.
Kafka ổn định.
Event quan trọng và muốn fail fast nếu publish lỗi.
```

## 10. Best Choice 2: Background Queue Trong App

### Ý tưởng

API không publish Kafka trực tiếp. API đưa event vào in-memory queue, rồi background service publish sau.

### Luồng

```text
Client gọi API CreateArticle
API validate
API save Post
API save Attachments
API query event data
API enqueue event vào memory queue
API return articleId

BackgroundService dequeue event
BackgroundService publish Kafka
Kafka xác nhận
Consumer xử lý event
```

### Interface Queue Mẫu

```csharp
public interface IBackgroundEventQueue
{
    ValueTask EnqueueAsync(
        ArticleCreatedIntegrationEvent payload,
        CancellationToken cancellationToken = default);

    ValueTask<ArticleCreatedIntegrationEvent> DequeueAsync(
        CancellationToken cancellationToken = default);
}
```

### Implementation Bằng Channel

```csharp
using System.Threading.Channels;
using SocialBackEnd.Common.Events;

public sealed class BackgroundEventQueue : IBackgroundEventQueue
{
    private readonly Channel<ArticleCreatedIntegrationEvent> _queue = Channel.CreateBounded<ArticleCreatedIntegrationEvent>(
        new BoundedChannelOptions(capacity: 1000)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

    public ValueTask EnqueueAsync(
        ArticleCreatedIntegrationEvent payload,
        CancellationToken cancellationToken = default)
    {
        // Nếu queue đầy, WriteAsync sẽ đợi đến khi có slot trong queue.
        return _queue.Writer.WriteAsync(payload, cancellationToken);
    }

    public ValueTask<ArticleCreatedIntegrationEvent> DequeueAsync(
        CancellationToken cancellationToken = default)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
```

### Background Worker Mẫu

```csharp
public sealed class ArticleEventPublishWorker : BackgroundService
{
    private readonly IBackgroundEventQueue _queue;
    private readonly IApplicationEventPublisher _publisher;
    private readonly ILogger<ArticleEventPublishWorker> _logger;

    public ArticleEventPublishWorker(
        IBackgroundEventQueue queue,
        IApplicationEventPublisher publisher,
        ILogger<ArticleEventPublishWorker> logger)
    {
        _queue = queue;
        _publisher = publisher;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var payload = await _queue.DequeueAsync(stoppingToken);

            try
            {
                await _publisher.PublishArticleCreatedAsync(payload, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to publish ArticleCreated event for article {ArticleId}",
                    payload.ArticleId);

                // Cần thêm retry/backoff nếu event quan trọng.
            }
        }
    }
}
```

### Service Khi Dùng Queue

```csharp
var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);
if (articleCreatedEvent is not null)
{
    await _backgroundEventQueue.EnqueueAsync(articleCreatedEvent);
}

return articleEntity.Id;
```

### Ưu điểm

```text
API trả nhanh hơn.
Kafka chậm tạm thời không làm request phải chờ broker.
Dễ implement hơn Outbox.
Tốt cho notification/email không quá critical.
```

### Nhược điểm

```text
Queue nằm trong memory.
App crash thì mất event trong queue.
Restart/deploy có thể mất event chưa publish.
Kafka down lâu có thể đầy queue.
Cần retry/backoff/logging.
Nhiều instance thì mỗi instance có queue riêng.
```

### Khi nên dùng

```text
Notification không bắt buộc 100% phải gửi.
Hệ thống nhỏ/vừa.
Muốn giảm latency API nhanh mà chưa muốn thêm Outbox.
Chấp nhận rủi ro mất event khi app crash.
```

## 11. Best Choice 3: Outbox Pattern

### Ý Tưởng

Outbox Pattern lưu event vào database cùng với business data, rồi background worker đọc outbox để publish Kafka.

Thay vì:

```text
Save DB -> Publish Kafka
```

Ta làm:

```text
Save DB + Save OutboxEvent trong cùng transaction -> Worker publish Kafka sau
```

### Luồng

```text
Client gọi API CreateArticle
API begin transaction
API save Post
API save Attachments
API save OutboxEvent
API commit transaction
API return articleId

OutboxWorker đọc event Pending
OutboxWorker publish Kafka
Kafka xác nhận
OutboxWorker mark Sent
Consumer đọc Kafka event
Consumer gửi email
Consumer commit offset
```

### Entity Outbox Mẫu

```csharp
public sealed class OutboxEvent : EntityBase
{
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public string Status { get; set; } = OutboxStatus.Pending;
    public int RetryCount { get; set; }
    public string? LastError { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }
}

public static class OutboxStatus
{
    public const string Pending = "Pending";
    public const string Sent = "Sent";
    public const string Failed = "Failed";
}
```

### Save Outbox Event Trong CreateArticle

```csharp
var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);

if (articleCreatedEvent is not null)
{
    var outboxEvent = new OutboxEvent
    {
        EventType = nameof(ArticleCreatedIntegrationEvent),
        PayloadJson = JsonSerializer.Serialize(articleCreatedEvent),
        Status = OutboxStatus.Pending
    };

    await _outboxRepository.AddAsync(outboxEvent, cancellationToken);
}

return articleEntity.Id;
```

Quan trọng: trong production, save `Post`, `Attachments` và `OutboxEvent` nên nằm trong cùng database transaction.

### Worker Đọc Outbox

```csharp
public sealed class OutboxPublisherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxPublisherWorker> _logger;

    public OutboxPublisherWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<OutboxPublisherWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var outboxRepository = scope.ServiceProvider.GetRequiredService<IOutboxRepository>();
            var publisher = scope.ServiceProvider.GetRequiredService<IApplicationEventPublisher>();

            var events = await outboxRepository.GetPendingEventsAsync(limit: 50, stoppingToken);

            foreach (var outboxEvent in events)
            {
                try
                {
                    if (outboxEvent.EventType == nameof(ArticleCreatedIntegrationEvent))
                    {
                        var payload = JsonSerializer.Deserialize<ArticleCreatedIntegrationEvent>(outboxEvent.PayloadJson);
                        if (payload is null)
                        {
                            throw new InvalidOperationException("Invalid outbox payload.");
                        }

                        await publisher.PublishArticleCreatedAsync(payload, stoppingToken);
                    }

                    outboxEvent.Status = OutboxStatus.Sent;
                    outboxEvent.ProcessedAtUtc = DateTime.UtcNow;
                    await outboxRepository.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    outboxEvent.RetryCount++;
                    outboxEvent.LastError = ex.Message;

                    if (outboxEvent.RetryCount >= 5)
                    {
                        outboxEvent.Status = OutboxStatus.Failed;
                    }

                    await outboxRepository.SaveChangesAsync(stoppingToken);

                    _logger.LogError(
                        ex,
                        "Failed to publish outbox event {OutboxEventId}",
                        outboxEvent.Id);
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}
```

### Ưu điểm

```text
API không phải chờ Kafka.
Event không mất khi app crash.
Kafka down thì event vẫn nằm trong DB để retry.
Có audit: event nào pending, sent, failed.
Phù hợp production.
Giảm coupling giữa request flow và Kafka.
Giải quyết bài toán DB save thành công nhưng Kafka publish fail.
```

### Nhược điểm

```text
Phức tạp hơn.
Cần thêm bảng OutboxEvents.
Cần background worker.
Cần retry/backoff.
Cần xử lý concurrency nếu chạy nhiều instance.
Có độ trễ nhỏ do worker polling.
Cần cleanup outbox event cũ.
```

### Khi Nên Dùng

```text
Event quan trọng.
Không muốn mất event.
Không muốn API chờ Kafka.
Hệ thống có nhiều service.
Cần scale và retry nghiêm túc.
Cần audit/debug message.
```

## 12. Consumer Và Commit Offset

Consumer hiện tại nên commit sau khi handle xong.

```csharp
HandleMessageAsync(result.Message.Value, stoppingToken).GetAwaiter().GetResult();
consumer.Commit(result);
```

Ý nghĩa:

```text
Xử lý thành công -> commit offset -> Kafka biết message đã xử lý.
Xử lý lỗi -> không commit -> message có thể được đọc lại.
```

Trong handler gửi email:

```csharp
foreach (var emailUserFollow in payload.EmailUserFollow)
{
    await emailService.SendEmailAsync(emailUserFollow, model, cancellationToken);
}
```

Cần `await` vì nếu không:

```text
Email chưa gửi xong.
Consumer commit offset mất rồi.
Email fail thì Kafka không retry message nữa.
```

## 13. Bottleneck Khi Consumer Xử Lý Nhiều Partition

Nếu 1 app instance có 1 consumer loop:

```text
Consumer consume message
Handle message xong
Commit
Consume message tiếp
```

Thì dù topic có nhiều partition, trong một instance vẫn có thể xử lý tuần tự trong loop.

Scale ngang như sau:

```text
Topic có 3 partitions
1 instance -> 1 consumer xử lý 3 partitions
2 instances -> Kafka chia 3 partitions cho 2 consumers
3 instances -> mỗi consumer gần 1 partition
4 instances -> consumer thứ 4 có thể idle cho topic đó
```

Kết luận:

```text
Số partition giới hạn mức scale của consumer group.
Nếu Notification topic chỉ có 1 partition, scale 5 app instance cũng chỉ có 1 consumer active cho topic đó.
```

## 14. Email Và Ảnh Thumbnail

Email client không đọc được `IFormFile` từ server. Ảnh trong email nên là URL public.

Dùng:

```csharp
public record NotificationArticleCreate
{
    public string Title;
    public string SubContent;
    public string Thumbnail; // URL public, ví dụ https://...
    public string LinkArticle;
    public string NameAuthor;
    public string AvatarAuthor;
    public DateTime CreateDate;
}
```

Không nên dùng:

```csharp
public IFormFile Thumbnail;
```

Lý do:

```text
IFormFile chỉ tồn tại trong request upload.
Email client cần URL để load ảnh.
Local file path trong server không có ý nghĩa với người nhận email.
```

## 15. Khi Nào Dùng Include, Khi Nào Dùng Projection?

Dùng `Include` khi cần trả về entity graph để đọc thông tin chi tiết.

```csharp
public Task<Post> GetDetailPostById(int articleId, CancellationToken cancellationToken = default)
{
    return DbContext.Posts
        .AsNoTracking()
        .Include(post => post.Author)
        .Include(post => post.Attachments)
        .FirstAsync(post => post.Id == articleId, cancellationToken);
}
```

Dùng projection khi cần DTO/event cụ thể.

```csharp
.Select(post => new ArticleCreatedIntegrationEvent
{
    ArticleId = post.Id,
    Title = post.Title,
    NameAuthor = post.Author.DisplayName
})
```

Quy tắc thực dụng:

```text
API detail cần model view -> projection sang model view là tốt nhất.
Kafka event cần payload cụ thể -> projection sang event là tốt nhất.
Update entity -> lấy entity tracked nếu cần update.
Read-only query -> AsNoTracking.
```

## 16. Lỗi Thường Gặp

### 16.1 Dùng First Khi Có Thể Rỗng

Không nên:

```csharp
var thumbnail = post.Attachments.Select(x => x.FilePath).First();
```

Nên:

```csharp
var thumbnail = post.Attachments
    .Select(x => x.FilePath)
    .FirstOrDefault() ?? string.Empty;
```

### 16.2 Fire-And-Forget Trong Request

Không nên:

```csharp
_applicationEventPublisher.PublishArticleCreatedAsync(payload);
return articleId;
```

Nên:

```csharp
await _applicationEventPublisher.PublishArticleCreatedAsync(payload);
```

Hoặc dùng background queue/outbox.

### 16.3 Commit Offset Trước Khi Xử Lý Xong

Không nên:

```csharp
_ = emailService.SendEmailAsync(email, model);
consumer.Commit(result);
```

Nên:

```csharp
await emailService.SendEmailAsync(email, model, cancellationToken);
consumer.Commit(result);
```

### 16.4 Để Publisher Query Database

Không nên:

```text
KafkaEventPublisher nhận Post rồi truy cập post.Author.Followers.
```

Nên:

```text
Application service/repository chuẩn bị ArticleCreatedIntegrationEvent.
KafkaEventPublisher chỉ publish.
```

## 17. Gợi Ý Hướng Đi Cho Project SocialBackEnd

### Giai Đoạn Hiện Tại

Giữ flow:

```text
CreateArticle -> query event projection -> await Kafka publish
```

Vì nó:

```text
Đơn giản.
Build được.
Dễ debug.
Tránh fire-and-forget.
```

### Khi Cần Tối Ưu Latency

Chuyển sang Outbox Pattern.

```text
CreateArticle -> save OutboxEvent -> return response
OutboxWorker -> publish Kafka -> mark sent
```

### Khi Notification Tăng Tải

Cần xem lại:

```text
Số partition của notification topic.
Số consumer instance.
Batch gửi email.
Rate limit của email provider.
Retry và dead-letter topic.
```

## 18. Keyword Nên Tìm Hiểu Tiếp

Kafka core:

```text
Apache Kafka topic partition offset
Kafka consumer group rebalancing
Kafka producer acks idempotent producer
Kafka message key partitioner
Kafka delivery semantics at most once at least once exactly once
Kafka dead letter queue DLQ
Kafka retry topic pattern
Kafka consumer lag
Kafka compaction vs retention
```

.NET async:

```text
C# async await thread pool
Task vs ValueTask
fire and forget in ASP.NET Core
BackgroundService in ASP.NET Core
System.Threading.Channels bounded channel
CancellationToken best practices
IServiceScopeFactory background service scoped dependency
```

Database và EF Core:

```text
EF Core lazy loading N+1 problem
EF Core Include vs Select projection
EF Core AsNoTracking
EF Core transaction
EF Core optimistic concurrency
EF Core split query
```

Distributed systems:

```text
Outbox Pattern
Transactional Outbox
Inbox Pattern
Idempotent consumer
Eventual consistency
Saga Pattern
Change Data Capture CDC
Debezium Kafka outbox
```

Email/notification:

```text
SMTP retry strategy
email provider rate limit
HTML email table layout
public image URL in email
email bounce handling
unsubscribe link best practices
```

Observability:

```text
structured logging
correlation id
distributed tracing
OpenTelemetry .NET
Kafka consumer lag monitoring
retry metrics
dead letter monitoring
```

## 19. Tóm Tắt Ngắn

```text
Dùng await trực tiếp: đơn giản, an toàn vừa đủ, nhưng API phải chờ Kafka.
Dùng background queue: API nhanh, nhưng app crash có thể mất event.
Dùng Outbox Pattern: API nhanh và đáng tin cậy, nhưng phức tạp hơn.
```

Với project hiện tại, hướng tốt theo từng bước:

```text
1. Giữ await Kafka publish để đúng và dễ debug.
2. Không dùng lazy loading implicit trong publisher.
3. Dùng repository projection để tạo ArticleCreatedIntegrationEvent.
4. Khi cần API nhanh và reliable hơn, implement Outbox Pattern.
```
