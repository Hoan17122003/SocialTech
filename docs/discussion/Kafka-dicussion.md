# Kafka Discussion

## 1. Mục tiêu tài liệu

Tài liệu này mô tả ngược lại phần tích hợp Kafka trong hệ thống `SocialBackEnd`, tập trung vào:

- Mục tiêu sử dụng Kafka trong kiến trúc hiện tại.
- Luồng xử lý Kafka thực tế đang có trong code.
- Các lỗi đã xảy ra trong quá trình chạy thử.
- Nguyên nhân gốc của lỗi.
- Cách fix đã áp dụng trong hệ thống.
- Best practices khi dùng Kafka, có code minh họa và comment giải thích chi tiết.
- Một số use case/case study thực tế để định hướng mở rộng sau này.

## 2. Vì sao hệ thống này dùng Kafka

Trước khi tích hợp Kafka, luồng gửi email đang là đồng bộ:

1. API nhận request.
2. Service ghi dữ liệu xuống DB hoặc cache.
3. Service gọi trực tiếp mail service.
4. Request chỉ kết thúc sau khi SMTP gửi xong.

Vấn đề của cách này:

- Response time của API bị phụ thuộc vào SMTP.
- Nếu SMTP chậm, request người dùng cũng chậm theo.
- Nếu sau này có thêm nhiều nghiệp vụ hậu xử lý như log event, push notification, analytics, audit, fan-out sang nhiều service thì code service sẽ phình ra.
- Service business bị gắn chặt vào hạ tầng gửi mail.

Kafka được đưa vào để tách hai việc:

- `Transaction/business change`: tạo user, tạo token reset password, tạo article.
- `Async side effects`: gửi mail, xử lý event, mở rộng sang notification, analytics, audit, recommendation, search indexing.

Nói ngắn gọn:

- DB hoặc cache thành công trước.
- Sau đó publish event sang Kafka.
- Consumer nền đọc event và xử lý mail/nghiệp vụ async.

## 3. Kiến trúc Kafka hiện tại trong hệ thống

### 3.1 Các topic đang dùng

Hệ thống hiện dùng 2 topic chính:

- `socialtech.notifications`
- `socialtech.domain-events`

Ý nghĩa:

- `socialtech.notifications`: chứa các event liên quan đến thông báo hoặc gửi email.
- `socialtech.domain-events`: chứa các event miền nghiệp vụ tổng quát như article created.

### 3.2 Cấu hình Kafka trong app

File cấu hình hiện tại:

- [appsettings.json](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/appsettings.json:40)

```json
"Kafka": {
  "BootstrapServers": "localhost:9094",
  "ConsumerGroupId": "socialtech-backend",
  "Topics": {
    "Notification": "socialtech.notifications",
    "DomainEvents": "socialtech.domain-events"
  }
}
```

Giải thích:

- `BootstrapServers`: địa chỉ app dùng để kết nối Kafka từ máy host.
- `ConsumerGroupId`: group id cho consumer nền của backend.
- `Topics.Notification`: topic cho email/notification event.
- `Topics.DomainEvents`: topic cho domain event tổng quát.

### 3.3 Cấu hình Kafka trong Docker Compose

File:

- [docker-compose.yml](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/docker-compose.yml:38)

Ở đây Kafka được publish 2 listener:

- `PLAINTEXT://kafka:9092`: cho container khác trong cùng network Docker.
- `EXTERNAL://localhost:9094`: cho app chạy ở máy host.

Điểm này rất quan trọng vì:

- Nếu backend chạy ngoài Docker thì phải dùng `localhost:9094`.
- Nếu backend chạy trong Docker Compose thì phải override thành `kafka:9092`.

## 4. Luồng Kafka thực tế trong hệ thống hiện tại

### 4.1 Luồng tạo user và gửi welcome email

Luồng tại:

- [UserAdapaterPort.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Application/Services/UserAdapaterPort.cs:58)
- [KafkaEventPublisher.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventPublisher.cs:37)
- [KafkaEventConsumer.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventConsumer.cs:151)
- [NotificationService.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Application/Notifications/NotificationService.cs:18)
- [MailAdapter.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Notifications/MailAdapter.cs:27)

Luồng chi tiết:

1. API gọi `CreateUserAsync`.
2. `UserAdapaterPort` validate input và hash password.
3. Repository lưu user vào DB thành công.
4. Sau khi DB thành công, `UserAdapaterPort` gọi `PublishWelcomeEmailRequestedAsync`.
5. `KafkaEventPublisher` đóng gói event vào `IntegrationEventEnvelope`.
6. Event được publish lên topic `socialtech.notifications`.
7. `KafkaEventConsumer` đang chạy nền sẽ subscribe topic này.
8. Consumer đọc event, deserialize payload.
9. Consumer gọi `IEmailNotificationService`.
10. `NotificationService` tìm đúng renderer theo model bằng `GetRequiredService<IEmailTemplateRenderer<TModel>>()`.
11. `MailAdapter` kết nối SMTP và gửi mail.

### 4.2 Luồng quên mật khẩu và gửi reset email

Luồng tại:

- [UserAdapaterPort.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Application/Services/UserAdapaterPort.cs:112)

Luồng chi tiết:

1. User gửi yêu cầu quên mật khẩu.
2. Service tìm user theo email.
3. Service tạo JWT reset và token tạm.
4. Service lưu token vào Redis/cache thành công.
5. Sau khi cache ghi thành công, service publish event `ForgetPasswordEmailRequestedIntegrationEvent`.
6. Consumer đọc event này.
7. Consumer dựng `ForgetPasswordEmailModel`.
8. Consumer gọi email service để gửi mail reset password.

Điểm quan trọng:

- Event chỉ được publish sau khi token đã được lưu thành công trong cache.
- Điều này tránh trường hợp gửi mail chứa link reset nhưng backend lại không lưu token.

### 4.3 Luồng tạo article và domain event

Luồng tại:

- [ArticleAdapterPort.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Application/Services/ArticleAdapterPort.cs:32)
- [KafkaEventPublisher.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventPublisher.cs:61)
- [KafkaEventConsumer.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventConsumer.cs:167)

Luồng chi tiết:

1. Service tạo article.
2. Nếu có attachment thì lưu file và ghi metadata attachment.
3. Sau khi các bước persistence hoàn tất, service publish `ArticleCreatedIntegrationEvent`.
4. Consumer đọc event và hiện tại log ra thông tin article created.

Trạng thái hiện tại:

- Event article created mới chỉ được log.
- Đây là điểm mở rộng tốt cho các nghiệp vụ sau này như:
  - indexing search
  - analytics
  - recommendation
  - fan-out notification
  - moderation pipeline

## 5. Envelope event đang dùng

File:

- [IntegrationEventEnvelope.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Common/Events/IntegrationEventEnvelope.cs:3)

```csharp
public sealed record IntegrationEventEnvelope(
    string EventType,
    DateTime OccurredAtUtc,
    string? Key,
    string Payload);
```

Giải thích:

- `EventType`: tên kiểu event để consumer biết phải deserialize sang model nào.
- `OccurredAtUtc`: thời điểm phát sinh event.
- `Key`: key partitioning hoặc grouping logic.
- `Payload`: dữ liệu event ở dạng JSON string.

Ưu điểm của cách bọc envelope:

- Topic có thể chứa nhiều loại event khác nhau.
- Consumer có thể switch theo `EventType`.
- Dễ mở rộng metadata như `TraceId`, `Version`, `CorrelationId`, `TenantId`.

## 6. Lỗi đã gặp trong quá trình tích hợp

### 6.1 Lỗi 1: broker disconnect ở `APIVERSION_QUERY`

Log:

```text
FAIL|rdkafka#consumer-1| [thrd:localhost:9094/bootstrap]:
localhost:9094/bootstrap: Disconnected: connection closed by peer: POLLHUP
```

Ý nghĩa:

- Client Kafka đã kết nối tới bootstrap server.
- Trong pha đàm phán API version, broker đóng connection sớm.

Nguyên nhân có thể gây ra lỗi kiểu này:

1. Broker vừa khởi động xong cổng nhưng metadata nội bộ chưa ổn định.
2. Client kết nối đúng cổng nhưng listener advertised chưa phù hợp ngữ cảnh host/container.
3. Broker đang startup nên có hiện tượng connection ngắn bị cắt rồi client reconnect.

Trong hệ thống này, sau khi kiểm tra thực tế:

- Kafka container vẫn chạy.
- `Test-NetConnection localhost -Port 9094` thành công.
- Broker API từ trong container truy vấn được bình thường.

Kết luận thực tế:

- Đây không phải lỗi broker chết hẳn.
- Nó là lỗi kết nối/transient xuất hiện trong giai đoạn broker warm-up hoặc metadata chưa sẵn hoàn toàn.

### 6.2 Lỗi 2: `Unknown topic or partition`

Log:

```text
Subscribed topic not available: socialtech.domain-events: Broker: Unknown topic or partition
Subscribed topic not available: socialtech.notifications: Broker: Unknown topic or partition
```

Đây là lỗi chính.

Nguyên nhân trực tiếp:

- Consumer đã subscribe vào 2 topic ứng dụng.
- Nhưng trong broker, 2 topic này chưa được tạo.

Tôi đã xác nhận thực tế:

- Broker lúc đầu chỉ có `__consumer_offsets`.
- Chưa có:
  - `socialtech.notifications`
  - `socialtech.domain-events`

### 6.3 Vì sao lại có lỗi đó

Có 3 lý do nền:

1. Code consumer subscribe topic ngay khi app khởi động.
2. Broker không đảm bảo rằng topic ứng dụng đã tồn tại sẵn.
3. Hệ thống đang kỳ vọng vào auto-create topic, nhưng auto-create không phải lúc nào cũng đáng tin cho startup flow.

Tại sao không nên phụ thuộc hoàn toàn vào auto-create:

- Topic có thể chưa được tạo kịp lúc consumer subscribe.
- Môi trường production nhiều nơi disable auto-create.
- Auto-create làm mất tính kiểm soát về partition count, replication factor, retention policy.

## 7. Cách fix đã áp dụng

### 7.1 Fix cấu hình bootstrap server cho app chạy ngoài Docker

Tôi đã giữ cấu hình app host dùng:

```json
"BootstrapServers": "localhost:9094"
```

Lý do:

- Kafka trong compose advertise listener ngoài là `localhost:9094`.
- Backend hiện đang chạy trên máy host, không chạy trong container.
- Nếu backend host mà lại dùng `kafka:9092` thì sẽ sai DNS/ngữ cảnh.

### 7.2 Fix bằng cách tạo topic chủ động khi app khởi động

Tôi thêm logic ở consumer để đảm bảo topic tồn tại trước khi subscribe:

- [KafkaEventConsumer.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventConsumer.cs:28)

Code chính:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    // Tạo topic trước khi bắt đầu consume để tránh subscribe vào topic chưa tồn tại.
    await EnsureTopicsExistAsync(stoppingToken);

    // Sau khi đảm bảo topic có sẵn, mới bắt đầu vòng lặp consume.
    await Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);
}
```

Giải thích:

- `EnsureTopicsExistAsync` chạy trước.
- Nếu topic chưa có, app tự tạo.
- Nếu topic đã tồn tại, app bỏ qua và tiếp tục chạy.

### 7.3 Fix bằng cách retry mềm khi topic chưa sẵn metadata

Code:

```csharp
catch (ConsumeException ex)
{
    // Nếu topic chưa sẵn sàng hoặc metadata chưa đồng bộ xong,
    // ta không fail cứng ngay mà đợi ngắn rồi retry.
    if (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
    {
        _logger.LogWarning("Kafka topics are not ready yet. Retrying consume shortly.");
        Task.Delay(TimeSpan.FromSeconds(2), stoppingToken).GetAwaiter().GetResult();
        continue;
    }

    _logger.LogError(ex, "Kafka consume error: {Reason}", ex.Error.Reason);
}
```

Giải thích:

- `UnknownTopicOrPart` ở startup không nhất thiết là lỗi business.
- Nó thường là tín hiệu metadata hoặc topic chưa sẵn ở đúng thời điểm subscribe.
- Retry ngắn giúp hệ thống self-heal thay vì crash/log đỏ liên tục.

### 7.4 Fix vận hành tức thời trên broker đang chạy

Ngoài fix trong code, tôi còn tạo trực tiếp 2 topic trong Kafka broker đang chạy:

- `socialtech.notifications`
- `socialtech.domain-events`

Mục tiêu:

- Dập lỗi ngay ở runtime hiện tại.
- Không phải chờ restart hệ thống rồi mới thấy topic được tạo.

## 8. Code walkthrough của các thành phần Kafka hiện tại

### 8.1 Producer publish event

File:

- [KafkaEventPublisher.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventPublisher.cs:75)

```csharp
private async Task PublishAsync<TPayload>(string topic, TPayload payload, string? key, CancellationToken cancellationToken)
{
    // Bọc payload vào envelope để consumer biết đây là loại event nào,
    // đồng thời có thêm metadata như thời gian phát sinh và key.
    var envelope = new IntegrationEventEnvelope(
        typeof(TPayload).Name,
        DateTime.UtcNow,
        key,
        JsonSerializer.Serialize(payload, JsonOptions));

    // Message gửi sang Kafka gồm key và value.
    // Key giúp Kafka quyết định partition nếu có nhiều partition.
    var message = new Message<string, string>
    {
        Key = key ?? string.Empty,
        Value = JsonSerializer.Serialize(envelope, JsonOptions)
    };

    // ProduceAsync là điểm gửi event ra broker.
    // Request hiện tại chỉ chờ tới khi broker ack event,
    // chứ không chờ tới khi consumer xử lý mail xong.
    var result = await _producer.ProduceAsync(topic, message, cancellationToken);

    _logger.LogInformation(
        "Published Kafka event {EventType} to topic {Topic} at offset {Offset}",
        envelope.EventType,
        topic,
        result.Offset.Value);
}
```

### 8.2 Consumer đảm bảo topic tồn tại

File:

- [KafkaEventConsumer.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventConsumer.cs:34)

```csharp
private async Task EnsureTopicsExistAsync(CancellationToken cancellationToken)
{
    // Admin client không dùng để consume message.
    // Nó chỉ dùng để quản trị Kafka như tạo topic, sửa config, đọc metadata.
    var config = new AdminClientConfig
    {
        BootstrapServers = _options.BootstrapServers
    };

    using var adminClient = new AdminClientBuilder(config).Build();

    try
    {
        // Chủ động tạo các topic ứng dụng thay vì trông chờ auto-create.
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
    }
    catch (CreateTopicsException ex) when (ex.Results.All(r => r.Error.Code == ErrorCode.TopicAlreadyExists))
    {
        // Nếu topic đã tồn tại thì đây không phải lỗi,
        // vì mục tiêu của hàm là "ensure exists".
        _logger.LogInformation("Kafka topics already exist.");
    }
}
```

### 8.3 Consumer xử lý event mail

File:

- [KafkaEventConsumer.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Infrastructure/Kafka/KafkaEventConsumer.cs:149)

```csharp
switch (envelope.EventType)
{
    case nameof(WelcomeEmailRequestedIntegrationEvent):
    {
        // Resolve service từ scope để đảm bảo dependency scoped hoạt động đúng.
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();

        // Deserialize payload thành kiểu dữ liệu đúng của event.
        var payload = DeserializePayload<WelcomeEmailRequestedIntegrationEvent>(envelope);

        // Dựng mail model mà renderer đang hiểu.
        var model = new WelcomeEmailModel(payload.Username, payload.VerifyLink);

        // Gửi mail ở background consumer thay vì request thread.
        await emailService.SendEmailAsync(payload.Email, model, cancellationToken);
        break;
    }
}
```

### 8.4 Notification service dựng nội dung mail

File:

- [NotificationService.cs](/d:/20-ProjectPersonal/04-SocialTech/SocialBackEnd/Application/Notifications/NotificationService.cs:18)

```csharp
public Task SendEmailAsync<TModel>(string to, TModel model, CancellationToken cancellationToken = default)
    where TModel : class
{
    ArgumentException.ThrowIfNullOrWhiteSpace(to);
    ArgumentNullException.ThrowIfNull(model);

    // Lấy renderer đúng theo generic type.
    // Ví dụ:
    // - WelcomeEmailModel -> WellcomeEmailRenderer
    // - ForgetPasswordEmailModel -> ForgetPasswordEmailRenderer
    var renderer = _serviceProvider.GetRequiredService<IEmailTemplateRenderer<TModel>>();

    // Dựng EmailMessage chuẩn hóa trước khi đẩy xuống adapter hạ tầng.
    var emailMessage = new EmailMessage(
        to,
        renderer.RenderSubject(model),
        renderer.RenderHtmlBody(model),
        renderer.RenderTextBody(model));

    // Thực thi gửi mail thật ở adapter SMTP.
    return _emailPortOut.SendAsync(emailMessage, cancellationToken);
}
```

Điểm hay của cách này:

- Consumer không cần biết HTML mail render thế nào.
- Consumer chỉ biết event -> mail model -> gọi email service.
- Phần dựng subject/body được tách riêng thành renderer.

## 9. Best practices khi dùng Kafka

Phần này có ví dụ code minh họa và comment chi tiết.

### 9.1 Chỉ publish event sau khi transaction nghiệp vụ thành công

Không nên:

- publish event trước rồi mới ghi DB.

Nên:

- ghi DB thành công rồi mới publish event.

Ví dụ tốt:

```csharp
public async Task<int> CreateUserAsync(RequestCreateAccount request)
{
    // 1. Validate input trước.
    if (request is null)
    {
        throw new ArgumentNullException(nameof(request));
    }

    // 2. Ghi dữ liệu business trước.
    var user = await _repository.CreateUserAsync(request);

    // 3. Chỉ khi DB thành công mới phát event.
    // Nếu publish trước khi DB commit, consumer có thể xử lý dữ liệu "ảo".
    await _eventPublisher.PublishWelcomeEmailRequestedAsync(
        user,
        $"https://yourapp.com/verify?userId={user.Id}");

    return user.Id;
}
```

Lý do:

- Giảm rủi ro consumer xử lý dữ liệu chưa tồn tại.
- Business state là nguồn chân lý trước, event là tín hiệu phát sinh sau.

### 9.2 Dùng envelope và versioning cho event

Ví dụ:

```csharp
public sealed record VersionedEnvelope(
    string EventType,
    int EventVersion,
    DateTime OccurredAtUtc,
    string? CorrelationId,
    string Payload);
```

Comment:

- `EventVersion` giúp nâng cấp schema event mà không phá consumer cũ.
- `CorrelationId` giúp trace một request xuyên suốt nhiều service.
- Khi hệ thống lớn dần, versioning gần như là bắt buộc.

### 9.3 Thiết kế consumer theo hướng idempotent

Kafka có thể deliver lại message trong một số tình huống. Vì thế consumer nên chịu được việc xử lý trùng.

Ví dụ minh họa:

```csharp
public async Task HandleWelcomeEmailAsync(string eventId, string email, WelcomeEmailModel model)
{
    // Nếu đã xử lý event này rồi thì bỏ qua.
    // Đây là kỹ thuật idempotency cơ bản.
    var alreadyProcessed = await _processedEventRepository.ExistsAsync(eventId);
    if (alreadyProcessed)
    {
        return;
    }

    // Thực hiện side effect.
    await _emailNotificationService.SendEmailAsync(email, model);

    // Chỉ đánh dấu đã xử lý sau khi side effect hoàn tất.
    await _processedEventRepository.SaveAsync(eventId);
}
```

Lý do:

- Tránh gửi mail 2 lần.
- Tránh update analytics trùng.
- Tránh tạo notification duplicate.

### 9.4 Tách topic theo mục đích nghiệp vụ, không gom tất cả vào một topic

Không nên:

```text
all-events
```

Nên:

```text
socialtech.notifications
socialtech.domain-events
socialtech.audit
socialtech.analytics
```

Lợi ích:

- Dễ quản trị retention policy.
- Dễ scale riêng từng loại consumer.
- Dễ phân quyền ACL.
- Dễ debug.

### 9.5 Dùng key hợp lý để giữ ordering theo aggregate

Ví dụ:

```csharp
var message = new Message<string, string>
{
    // Dùng userId làm key để các event của cùng một user
    // có xu hướng vào cùng partition và giữ thứ tự tương đối.
    Key = user.Id.ToString(),
    Value = serializedEnvelope
};
```

Giải thích:

- Nếu nhiều event của cùng một user phải giữ thứ tự, key nên là `userId`.
- Nếu event theo article, key có thể là `articleId`.
- Nếu key lung tung hoặc random thì ordering theo entity sẽ không ổn.

### 9.6 Không để logic business nặng nằm trong consumer mà không có retry/dead-letter strategy

Ví dụ nên có:

```csharp
try
{
    // Xử lý side effect chính.
    await _emailNotificationService.SendEmailAsync(email, model, cancellationToken);
}
catch (SmtpCommandException ex)
{
    // Trường hợp hạ tầng ngoài bị lỗi, nên log rõ để retry hoặc chuyển DLQ.
    _logger.LogError(ex, "SMTP failed for {Email}", email);

    // Trong production, thường sẽ publish sang dead-letter topic
    // hoặc enqueue retry riêng thay vì nuốt lỗi.
    throw;
}
```

Best practice tốt hơn:

- retry có backoff
- dead-letter topic
- metrics số lần fail
- alert khi fail rate tăng

### 9.7 Dùng Outbox Pattern nếu cần độ tin cậy cao giữa DB và Kafka

Hiện tại hệ thống đang theo kiểu:

- DB success
- sau đó publish Kafka

Vấn đề tiềm ẩn:

- Nếu DB commit xong nhưng app chết trước khi publish Kafka thì event bị mất.

Khi nào cần outbox:

- nghiệp vụ quan trọng
- cần bảo đảm event không mất
- nhiều service downstream phụ thuộc event đó

Pseudo code:

```csharp
public async Task CreateUserWithOutboxAsync(RequestCreateAccount request)
{
    // Bắt đầu transaction DB.
    using var tx = await _dbContext.Database.BeginTransactionAsync();

    // 1. Lưu user.
    var user = new User
    {
        Username = request.Username,
        Email = request.Email
    };
    _dbContext.Users.Add(user);

    // 2. Lưu luôn event vào bảng outbox trong cùng transaction.
    var outbox = new OutboxMessage
    {
        EventType = "WelcomeEmailRequestedIntegrationEvent",
        Payload = JsonSerializer.Serialize(new
        {
            user.Email,
            user.Username
        }),
        OccurredAtUtc = DateTime.UtcNow
    };
    _dbContext.OutboxMessages.Add(outbox);

    // 3. Commit một lần.
    await _dbContext.SaveChangesAsync();
    await tx.CommitAsync();
}
```

Giải thích:

- Nếu transaction commit thành công thì cả user và outbox event đều tồn tại.
- Một background publisher khác sẽ đọc bảng outbox và đẩy sang Kafka.
- Đây là pattern rất mạnh để tránh mất event.

### 9.8 Thêm correlation id để trace end-to-end

Ví dụ:

```csharp
public sealed record TraceableEnvelope(
    string EventType,
    string CorrelationId,
    DateTime OccurredAtUtc,
    string Payload);
```

Giải thích:

- Một request HTTP có thể sinh ra nhiều event.
- `CorrelationId` giúp nối log từ controller -> service -> producer -> consumer -> SMTP.
- Khi debug production, đây là thứ cực kỳ hữu ích.

### 9.9 Định nghĩa retry policy rõ ràng cho producer và consumer

Ví dụ producer config:

```csharp
var config = new ProducerConfig
{
    BootstrapServers = "localhost:9094",

    // Acks.All yêu cầu broker leader và replica xác nhận,
    // giúp tăng độ an toàn dữ liệu.
    Acks = Acks.All,

    // Idempotence giúp giảm duplicate khi retry.
    EnableIdempotence = true,

    // Có thể bổ sung thêm retry và timeout tùy nhu cầu production.
    MessageSendMaxRetries = 3,
    RetryBackoffMs = 500
};
```

### 9.10 Luôn quan sát bằng metrics và logs

Nên đo ít nhất:

- producer success/fail count
- consumer lag
- retry count
- dead-letter count
- email send success/fail count
- average processing time per event

Nếu không có observability, Kafka chỉ biến lỗi đồng bộ thành lỗi bất đồng bộ khó nhìn hơn.

## 10. Use case thực tế phù hợp với SocialTech

### 10.1 Notification fan-out

Ví dụ:

- user follow user khác
- user comment vào bài viết
- user vote bài viết

Kafka phù hợp để:

- publish `UserFollowed`
- consumer A gửi in-app notification
- consumer B gửi email digest
- consumer C ghi analytics

Một event, nhiều consumer, các luồng độc lập nhau.

### 10.2 Audit log và activity stream

Ví dụ:

- login success
- login failure
- article created
- article deleted
- password changed

Kafka tốt cho:

- lưu audit trail
- build activity feed
- phục vụ compliance hoặc forensic analysis

### 10.3 Search indexing

Ví dụ:

- `ArticleCreated`
- `ArticleUpdated`
- `ArticleDeleted`

Consumer search có thể đồng bộ sang Elasticsearch hoặc OpenSearch mà không làm chậm request API chính.

### 10.4 Analytics pipeline

Ví dụ:

- page view
- like
- share
- follow
- comment

Kafka phù hợp vì:

- throughput cao
- không chặn transaction chính
- dễ stream dữ liệu sang data lake, ClickHouse, BigQuery, Spark, Flink

### 10.5 Moderation pipeline

Ví dụ:

- article created
- comment created

Consumer khác có thể:

- quét từ khóa độc hại
- chạy AI moderation
- chấm spam score
- gắn cờ review thủ công

### 10.6 Email sending at scale

Kafka rất hợp nếu:

- số lượng mail tăng mạnh
- cần retry theo batch
- cần tách warm-up mail provider
- cần thống kê gửi mail

Ví dụ hệ thống thực tế:

- e-commerce gửi order confirmation
- social platform gửi notification digest
- fintech gửi alert giao dịch

## 11. Case study ngắn trong thực tế

### 11.1 E-commerce order processing

Luồng điển hình:

1. Order service ghi order vào DB.
2. Publish `OrderCreated`.
3. Inventory service trừ kho.
4. Payment service xử lý thanh toán.
5. Email service gửi order confirmation.
6. Analytics service ghi số liệu bán hàng.

Ý nghĩa:

- Không service nào phải gọi trực tiếp tất cả service khác.
- Hệ thống tách rời, scale độc lập.

### 11.2 Ride-hailing / delivery platform

Event:

- trip requested
- driver assigned
- trip started
- trip completed

Kafka phù hợp vì:

- event dồn dập
- nhiều consumer quan tâm cùng lúc
- cần real-time streaming

### 11.3 Social platform activity system

Event:

- post created
- comment created
- user followed
- content reported

Consumer:

- notification consumer
- feed ranking consumer
- moderation consumer
- analytics consumer

Đây chính là hướng gần nhất với hệ thống SocialTech của anh.

## 12. Rủi ro và giới hạn của thiết kế hiện tại

Hiện tại thiết kế đã tốt hơn nhiều so với gửi mail đồng bộ, nhưng vẫn có vài giới hạn:

### 12.1 Chưa có outbox

Rủi ro:

- DB success nhưng publish Kafka fail thì event có thể mất.

### 12.2 Chưa có dead-letter topic

Rủi ro:

- mail fail liên tục thì chưa có luồng gom các event lỗi để xử lý lại sau.

### 12.3 Chưa có idempotency store cho consumer

Rủi ro:

- nếu event được giao lại, mail có thể bị gửi lặp.

### 12.4 Chưa có observability đủ sâu

Nên bổ sung:

- correlation id
- metrics consumer lag
- dashboard producer/consumer
- alert khi SMTP fail rate tăng

## 13. Đề xuất roadmap tiếp theo

Nếu mở rộng Kafka bài bản hơn, thứ tự hợp lý là:

1. Bổ sung `CorrelationId` và `EventVersion` cho envelope.
2. Thêm `Dead Letter Topic` cho notification fail.
3. Thêm idempotency guard cho consumer gửi mail.
4. Chuyển sang `Outbox Pattern` cho các event quan trọng.
5. Tách consumer theo nhóm nghiệp vụ:
   - notification consumer
   - analytics consumer
   - moderation consumer
   - search indexing consumer
6. Thêm metrics và dashboard.

## 14. Kết luận

Kafka trong hệ thống hiện tại đang được dùng đúng tinh thần event-driven cơ bản:

- business write thành công trước
- side effect chạy async sau
- mail không còn block request
- luồng event có thể mở rộng cho notification và domain event khác

Lỗi chính đã gặp không phải do code publish/consume sai business logic, mà do startup/runtime behavior:

- broker có kết nối transient lúc warm-up
- topic ứng dụng chưa tồn tại khi consumer subscribe

Cách fix đã áp dụng:

- cấu hình đúng bootstrap server theo ngữ cảnh host
- tạo topic chủ động
- retry mềm khi topic metadata chưa sẵn
- tạo trực tiếp topic trên broker đang chạy để xử lý runtime ngay

Đây là bước khởi đầu tốt. Nếu cần production-grade mạnh hơn, phần cần nâng cấp tiếp theo là:

- outbox
- idempotency
- dead-letter
- metrics/observability
