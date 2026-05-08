# Email Notification Discussion

Tài liệu này giải thích cách hoạt động của notification email trong SocialBackEnd, dựa trên các file hiện có trong project: `NotificationService`, `IEmailTemplateRenderer`, `MailAdapter`, `OAuth2AccessTokenProvider`, `SmtpOptions` và các email model.

## 1. Mục tiêu thiết kế

Luồng email trong project đang được tách thành nhiều lớp rõ ràng:

- Application service chỉ biết gửi notification theo model nghiệp vụ.
- Template renderer chịu trách nhiệm tạo subject, HTML body và text body.
- Notification service ghép renderer với email gateway.
- Mail adapter gửi email thật qua SMTP.
- OAuth2 access token provider lấy access token để authenticate SMTP bằng OAuth2.

Thiết kế này giúp application không phụ thuộc trực tiếp vào MailKit hoặc SMTP.

## 2. Các thành phần chính

### 2.1. `IEmailNotificationService`

File: `Application/Notifications/IEmailNotificationService.cs`

```csharp
public interface IEmailNotificationService
{
    Task SendEmailAsync<TModel>(
        string to,
        TModel model,
        CancellationToken cancellationToken = default)
        where TModel : class;
}
```

Đây là API tầng application dùng để gửi email theo model.

Ví dụ trong flow tạo user:

```csharp
var emailModel = new WelcomeEmailModel(
    Username: userEntity.Username,
    VerifyLink: $"https://yourapp.com/verify?userId={userEntity.Id}"
);

await _emailNoificationService.SendEmailAsync(
    to: userEntity.Email,
    model: emailModel,
    cancellationToken: default
);
```

### 2.2. `IEmailTemplateRenderer<TModel>`

File: `Application/Notifications/IEmailTemplateRenderer.cs`

```csharp
public interface IEmailTemplateRenderer<in TModel>
{
    string RenderSubject(TModel model);
    string RenderHtmlBody(TModel model);
    string? RenderTextBody(TModel model) => null;
}
```

Mỗi loại email sẽ có một model và một renderer tương ứng.

Ví dụ:

- `WelcomeEmailModel` dùng `WellcomeEmailRenderer`.
- `ForgetPasswordEmailModel` nên có `ForgetPasswordEmailRenderer` riêng.

### 2.3. Email model

Welcome email model:

```csharp
public record class WelcomeEmailModel
(
    string Username,
    string VerifyLink
);
```

Forget password email model:

```csharp
public record class ForgetPasswordEmailModel
(
    string Username,
    string ResetPasswordLink
);
```

Model chỉ chứa dữ liệu cần render email, không chứa logic gửi email.

### 2.4. `NotificationService`

File: `Application/Notifications/NotificationService.cs`

```csharp
public Task SendEmailAsync<TModel>(string to, TModel model, CancellationToken cancellationToken = default)
    where TModel : class
{
    ArgumentException.ThrowIfNullOrWhiteSpace(to);
    ArgumentNullException.ThrowIfNull(model);

    var renderer = _serviceProvider.GetRequiredService<IEmailTemplateRenderer<TModel>>();
    var emailMessage = new EmailMessage(
        to,
        renderer.RenderSubject(model),
        renderer.RenderHtmlBody(model),
        renderer.RenderTextBody(model));

    return _emailPortOut.SendAsync(emailMessage, cancellationToken);
}
```

Ý nghĩa:

1. Validate email nhận và model.
2. Dựa vào type của model để resolve đúng renderer từ DI.
3. Renderer tạo subject, HTML body, text body.
4. Đóng gói thành `EmailMessage`.
5. Gửi qua `IEmailPortOut`.

Đây là generic dispatch pattern: model nào thì renderer đó.

### 2.5. `EmailMessage`

File: `Common/DTOs/Mail/EmailMessage.cs`

```csharp
public sealed record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    string? TextBody = null
);
```

Đây là DTO ở tầng application/common, giúp tầng application không phụ thuộc vào `MimeMessage` của MailKit.

### 2.6. `MailAdapter`

File: `Infrastructure/Notifications/MailAdapter.cs`

`MailAdapter` implement `IEmailPortOut`, chịu trách nhiệm gửi email thật.

Flow chính:

1. Validate SMTP options.
2. Tạo `MimeMessage`.
3. Set From, To, Subject.
4. Dùng `BodyBuilder` để set HTML body và text body.
5. Connect tới SMTP server.
6. Lấy OAuth2 access token.
7. Authenticate bằng `SaslMechanismOAuth2`.
8. Send email.
9. Disconnect.
10. Log thành công.

Code lõi:

```csharp
var mimeMessage = new MimeMessage();
mimeMessage.From.Add(new MailboxAddress(_smtpOptions.FromName, _smtpOptions.FromEmail));
mimeMessage.To.Add(MailboxAddress.Parse(emailMessage.To));
mimeMessage.Subject = emailMessage.Subject;

var bodyBuilder = new BodyBuilder
{
    HtmlBody = emailMessage.HtmlBody,
    TextBody = emailMessage.TextBody
};

mimeMessage.Body = bodyBuilder.ToMessageBody();
```

Kết nối SMTP:

```csharp
using var smtpClient = new SmtpClient();
var socketOptions = _smtpOptions.UseSsl
    ? SecureSocketOptions.SslOnConnect
    : SecureSocketOptions.StartTls;

await smtpClient.ConnectAsync(
    _smtpOptions.Host,
    _smtpOptions.Port,
    socketOptions,
    cancellationToken);
```

Authenticate OAuth2:

```csharp
var accessToken = await _accessTokenProvider.GetAccessTokenAsync(cancellationToken);
var oauth2 = new SaslMechanismOAuth2(_smtpOptions.FromEmail, accessToken);
await smtpClient.AuthenticateAsync(oauth2, cancellationToken);
```

Gửi email:

```csharp
await smtpClient.SendAsync(mimeMessage, cancellationToken);
await smtpClient.DisconnectAsync(true, cancellationToken);
```

## 3. OAuth2 access token provider

File: `Infrastructure/Notifications/OAuth2AccessTokenProvider.cs`

Provider này dùng refresh token để xin access token mới từ OAuth2 token endpoint.

Payload gửi đi:

```csharp
var formValues = new List<KeyValuePair<string, string>>
{
    new("grant_type", "refresh_token"),
    new("client_id", oauthOptions.ClientId),
    new("client_secret", oauthOptions.ClientSecret),
    new("refresh_token", oauthOptions.RefreshToken)
};
```

Nếu có scope:

```csharp
if (!string.IsNullOrWhiteSpace(oauthOptions.Scope))
{
    formValues.Add(new KeyValuePair<string, string>("scope", oauthOptions.Scope));
}
```

Gửi request:

```csharp
using var response = await _httpClient.SendAsync(request, cancellationToken);
var payload = await response.Content.ReadAsStringAsync(cancellationToken);
```

Nếu token endpoint trả lỗi, service log lỗi và throw exception:

```csharp
_logger.LogError(
    "Failed to acquire OAuth2 access token. Status: {StatusCode}. Body: {Body}",
    response.StatusCode,
    payload);
```

Nếu thành công, parse JSON và trả về `access_token`.

## 4. Cấu hình SMTP

File: `Infrastructure/Notifications/SmtpOptions.cs`

```csharp
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public bool UseSsl { get; set; } = true;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "SocialTech";
    public OAuth2Options OAuth2 { get; set; } = new();
}
```

Ví dụ cấu hình:

```json
{
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 465,
    "UseSsl": true,
    "FromEmail": "no-reply@socialtech.example",
    "FromName": "SocialTech",
    "OAuth2": {
      "TokenEndpoint": "https://oauth2.googleapis.com/token",
      "ClientId": "your-client-id",
      "ClientSecret": "your-client-secret",
      "RefreshToken": "your-refresh-token",
      "Scope": "https://mail.google.com/"
    }
  }
}
```

Không commit các giá trị thật của `ClientSecret` và `RefreshToken` vào source code.

## 5. Đăng ký DI

Trong `ServiceDependencyInjection.cs`, project đang đăng ký:

```csharp
services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));

services.AddHttpClient<IEmailAccessTokenProvider, OAuth2AccessTokenProvider>();
services.AddScoped<IEmailPortOut, MailAdapter>();
services.AddScoped<IEmailNotificationService, NotificationService>();
services.AddScoped<IEmailTemplateRenderer<WelcomeEmailModel>, WellcomeEmailRenderer>();
```

Điểm cần chú ý: nếu gọi `SendEmailAsync` với `ForgetPasswordEmailModel`, DI cũng cần có renderer tương ứng:

```csharp
services.AddScoped<IEmailTemplateRenderer<ForgetPasswordEmailModel>, ForgetPasswordEmailRenderer>();
```

Nếu chưa đăng ký renderer, `NotificationService` sẽ lỗi tại dòng:

```csharp
var renderer = _serviceProvider.GetRequiredService<IEmailTemplateRenderer<TModel>>();
```

## 6. Cách thêm một email mới

Ví dụ thêm email quên mật khẩu.

### Bước 1: Tạo model

```csharp
public record class ForgetPasswordEmailModel(
    string Username,
    string ResetPasswordLink
);
```

### Bước 2: Tạo renderer

```csharp
public sealed class ForgetPasswordEmailRenderer : IEmailTemplateRenderer<ForgetPasswordEmailModel>
{
    public string RenderSubject(ForgetPasswordEmailModel model)
        => "Reset your SocialTech password";

    public string RenderHtmlBody(ForgetPasswordEmailModel model)
        => $"""
           <h1>Reset password</h1>
           <p>Hello {model.Username},</p>
           <p>Click the link below to reset your password:</p>
           <a href="{model.ResetPasswordLink}">Reset password</a>
           """;

    public string RenderTextBody(ForgetPasswordEmailModel model)
        => $"Hello {model.Username}. Reset your password here: {model.ResetPasswordLink}";
}
```

### Bước 3: Đăng ký DI

```csharp
services.AddScoped<IEmailTemplateRenderer<ForgetPasswordEmailModel>, ForgetPasswordEmailRenderer>();
```

### Bước 4: Gửi email từ application service

```csharp
var emailModel = new ForgetPasswordEmailModel(
    Username: user.Username,
    ResetPasswordLink: resetPasswordLink
);

await _emailNoificationService.SendEmailAsync(
    to: user.Email,
    model: emailModel,
    cancellationToken: cancellationToken
);
```

## 7. Best practice cho email notification

### 7.1. Tách template khỏi business logic

Application service chỉ nên tạo model và gọi notification service. Không nên viết HTML email trực tiếp trong service nghiệp vụ.

### 7.2. Luôn có text body

Một số mail client hoặc spam filter đánh giá tốt hơn khi email có cả HTML body và text body.

### 7.3. Không log secret

Không log access token, refresh token, client secret hoặc full OAuth response nếu có thông tin nhạy cảm.

### 7.4. Validate cấu hình sớm

`MailAdapter.ValidateOptions()` đang làm đúng hướng: thiếu host, port, from email hoặc OAuth2 config thì throw rõ ràng.

### 7.5. Email nên gửi async

SMTP và OAuth2 token endpoint là I/O. Luôn dùng async/await, không dùng `.Result` hoặc `.Wait()`.

### 7.6. Với production nên dùng background job

Hiện tại email được gửi trực tiếp trong request flow. Cách này đơn giản nhưng có nhược điểm: request phải chờ SMTP hoàn tất.

Ở production, nên cân nhắc:

- Queue email vào background worker.
- Dùng outbox pattern để tránh mất email nếu request thành công nhưng SMTP lỗi.
- Retry có giới hạn.
- Lưu trạng thái gửi email.

### 7.7. Encode dữ liệu người dùng khi render HTML

Nếu template đưa dữ liệu user nhập vào HTML, nên HTML encode để tránh HTML injection. Ví dụ username, display name, title do user nhập nên được encode trước khi đưa vào template.

### 7.8. Link trong email nên lấy từ config

Không nên hard-code:

```csharp
https://yourapp.com/reset-password
```

Nên đưa base URL vào config:

```json
{
  "App": {
    "FrontendBaseUrl": "https://socialtech.example"
  }
}
```

Sau đó build link từ config.

## 8. Luồng tổng quát khi gửi welcome email

1. User đăng ký tài khoản.
2. `CreateUserAsync` tạo user trong database.
3. Service tạo `WelcomeEmailModel`.
4. Gọi `SendEmailAsync(to, model)`.
5. `NotificationService` resolve `IEmailTemplateRenderer<WelcomeEmailModel>`.
6. `WellcomeEmailRenderer` render subject/body.
7. `NotificationService` tạo `EmailMessage`.
8. `MailAdapter` convert `EmailMessage` sang `MimeMessage`.
9. `OAuth2AccessTokenProvider` lấy access token.
10. `MailAdapter` authenticate SMTP và gửi email.
11. Ghi log gửi thành công.

## 9. Các rủi ro hiện tại cần chú ý

- `ForgetPasswordEmailModel` đang được dùng trong `RequestForgetPasswordAsync`, nhưng cần đảm bảo có renderer và DI registration tương ứng.
- Tên class `WellcomeEmailRenderer` đang bị typo, chuẩn tiếng Anh là `WelcomeEmailRenderer`. Nếu đổi tên, cần đổi cả DI registration.
- Gửi email trực tiếp trong request có thể làm endpoint chậm nếu SMTP chậm.
- Link verify/reset password đang hard-code domain `https://yourapp.com`, nên chuyển sang config.
