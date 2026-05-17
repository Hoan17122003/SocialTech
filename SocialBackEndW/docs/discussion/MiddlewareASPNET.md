# Middleware ASP.NET Core

Tài liệu này giải thích middleware trong ASP.NET Core theo cách dễ hình dung, bám sát code hiện tại của `SocialBackEnd`. Nội dung tập trung vào:

- Middleware là gì và chạy ở đâu trong request pipeline
- Cách xử lý lỗi bằng `GlobalExceptionMiddleware`
- Best practices khi handle lỗi trong middleware
- So sánh với `GlobalExceptionHandler` trong Spring Boot
- Cách viết custom middleware cho từng nghiệp vụ
- Các middleware có sẵn trong hệ sinh thái ASP.NET Core

## 1. Middleware là gì?

Trong ASP.NET Core, middleware là các khối xử lý được xâu chuỗi với nhau thành một pipeline.

Mỗi HTTP request đi vào server sẽ chạy lần lượt qua pipeline này:

1. Middleware đầu tiên nhận request.
2. Middleware đó có thể xử lý một phần logic.
3. Nếu gọi tiếp `await _next(context)`, request được chuyển sang middleware kế tiếp.
4. Khi middleware cuối cùng xử lý xong, response đi ngược lại qua các middleware trước đó.

Ta có thể hình dung middleware như các lớp bao quanh request:

```text
Request
  -> Middleware A
    -> Middleware B
      -> Middleware C
        -> Controller / Endpoint
      <- Middleware C
    <- Middleware B
  <- Middleware A
Response
```

Điểm quan trọng:

- Middleware chạy trước controller.
- Middleware có thể dừng pipeline sớm.
- Middleware có thể sửa request.
- Middleware có thể sửa response.
- Middleware rất phù hợp cho cross-cutting concerns như logging, authentication, exception handling, correlation id, rate limiting.

## 2. Pipeline trong project `SocialBackEnd`

Trong `Program.cs`, project hiện đang cấu hình pipeline như sau:

```csharp
var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "wwwroot")),
    RequestPath = string.Empty
});

app.UseCors("FrontendDev");
app.UseSecurityConfiguration();

app.MapControllers();
```

Ý nghĩa của thứ tự này:

- `GlobalExceptionMiddleware` được đặt rất sớm để bắt lỗi của gần như toàn bộ pipeline phía sau.
- `Swagger`, `StaticFiles`, `Authentication`, `Authorization`, `Controllers` đều nằm sau nó.
- Nếu controller, repository, service, hoặc middleware phía sau ném exception, `GlobalExceptionMiddleware` có cơ hội bắt được.

Đây là một cách đặt khá tốt cho middleware xử lý lỗi toàn cục.

## 3. Cơ chế hoạt động của `GlobalExceptionMiddleware`

Code hiện tại:

```csharp
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            LogException(exception);
            await HandleExceptionAsync(context, exception);
        }
    }
}
```

Ý tưởng chính:

- Middleware cho request đi tiếp bằng `await _next(context)`.
- Nếu bất kỳ chỗ nào phía sau ném exception và không có ai bắt lại, exception sẽ quay về đây.
- Middleware chuyển exception thành HTTP response có format thống nhất.
- Middleware cũng quyết định log ở mức nào.

Đây chính là vai trò của một global exception handler trong ASP.NET Core.

## 4. Vì sao trước đó bạn thấy terminal in nguyên stack trace?

Đây là điểm rất dễ gây hiểu nhầm.

Khi middleware bắt exception, không có nghĩa là terminal sẽ hoàn toàn im lặng. Nếu trong middleware bạn log như sau:

```csharp
_logger.LogError(exception, "Unhandled exception");
```

thì logger sẽ in đầy đủ stack trace ra terminal hoặc file log. Khi nhìn vào console, ta dễ tưởng rằng exception chưa được xử lý, nhưng thực ra:

- exception đã được bắt
- response vẫn có thể đã được trả về cho client
- thứ bạn nhìn thấy là phần log, không phải lỗi chưa được handle

Vì vậy cần phân biệt:

- `handled exception`: lỗi nghiệp vụ đã dự kiến trước, ví dụ `NotFoundException`, `ValidationException`
- `unhandled exception`: lỗi hệ thống không mong đợi, ví dụ null reference, lỗi mapping, lỗi EF do query sai, lỗi dependency ngoài dự kiến

## 5. Cách project này đang handle lỗi

Middleware hiện tại chia lỗi thành 2 nhóm lớn:

### 5.1. Lỗi nghiệp vụ đã dự kiến

Các exception như:

- `ValidationException`
- `NotFoundException`
- `ConflicException`
- `AppException`
- `ArgumentException`
- `UnauthorizedAccessException`

sẽ:

- được map sang HTTP status code phù hợp
- được trả về theo format `ApiResponse<object>.Fail(...)`
- chỉ log mức `Warning` ngắn gọn

Ví dụ:

```csharp
private void LogException(Exception exception)
{
    switch (exception)
    {
        case ValidationException:
        case NotFoundException:
        case ConflicException:
        case AppException:
        case ArgumentException:
        case UnauthorizedAccessException:
            _logger.LogWarning(
                "Handled exception: {ExceptionType} - {Message}",
                exception.GetType().Name,
                exception.Message);
            break;
        default:
            _logger.LogError(exception, "Unhandled exception");
            break;
    }
}
```

### 5.2. Lỗi hệ thống không mong đợi

Các exception không nằm trong danh sách trên sẽ:

- trả về `500 InternalServerError`
- response có message chung, không lộ chi tiết nội bộ
- log mức `Error` kèm stack trace để dev điều tra

Ví dụ:

```csharp
_ => (
    HttpStatusCode.InternalServerError,
    ApiResponse<object>.Fail("An unexpected error occurred."))
```

Đây là cách handle rất thực tế cho môi trường production.

## 6. Mapping exception sang HTTP response

Phần xử lý response trong middleware:

```csharp
private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
{
    var (statusCode, response) = exception switch
    {
        ValidationException validationException => (
            HttpStatusCode.BadRequest,
            ApiResponse<object>.Fail(validationException.Message, validationException.Errors)),
        NotFoundException notFoundException => (
            HttpStatusCode.NotFound,
            ApiResponse<object>.Fail(notFoundException.Message)),
        ConflicException conflicException => (
            HttpStatusCode.Conflict,
            ApiResponse<object>.Fail(conflicException.Message)),
        UnauthorizedAccessException unauthorizedAccessException => (
            HttpStatusCode.Forbidden,
            ApiResponse<object>.Fail(unauthorizedAccessException.Message)),
        ArgumentException argumentException => (
            HttpStatusCode.BadRequest,
            ApiResponse<object>.Fail(argumentException.Message)),
        AppException appException => (
            HttpStatusCode.BadRequest,
            ApiResponse<object>.Fail(appException.Message)),
        _ => (
            HttpStatusCode.InternalServerError,
            ApiResponse<object>.Fail("An unexpected error occurred."))
    };

    context.Response.ContentType = "application/json";
    context.Response.StatusCode = (int)statusCode;

    await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonSerializerOptions));
}
```

Ý nghĩa:

- Exception type là trung tâm của việc quyết định status code.
- Controller/service chỉ cần `throw`.
- Middleware chịu trách nhiệm convert sang HTTP response chuẩn.
- Nhờ đó logic nghiệp vụ không bị lẫn với logic format lỗi HTTP.

## 7. Bài học thực tế từ bug `Sequence contains no elements`

Một case rất điển hình trong project là:

```text
System.InvalidOperationException: Sequence contains no elements
```

Nguyên nhân không nằm ở middleware, mà ở repository query dữ liệu theo kiểu bắt buộc phải có bản ghi, ví dụ `FirstAsync()` hoặc `SingleAsync()`.

Ví dụ không tốt:

```csharp
public Task<Post> GetDetailArticleById(int articleId, CancellationToken cancellationToken = default)
{
    return DbContext.Posts
        .AsNoTracking()
        .Include(post => post.Author)
        .Include(post => post.Attachments)
        .FirstAsync(post => post.Id == articleId, cancellationToken);
}
```

Nếu `articleId` không tồn tại, EF sẽ ném `InvalidOperationException` ngay tại repository. Lúc này:

- service chưa kịp kiểm tra `null`
- `NotFoundException` chưa được throw
- middleware chỉ thấy một exception hệ thống và log full stack trace

Giải pháp đúng là để repository trả `null`:

```csharp
public Task<Post?> GetDetailArticleById(int articleId, CancellationToken cancellationToken = default)
{
    return DbContext.Posts
        .AsNoTracking()
        .Include(post => post.Author)
        .Include(post => post.Attachments)
        .FirstOrDefaultAsync(post => post.Id == articleId, cancellationToken);
}
```

Sau đó service mới quyết định:

```csharp
var article = await _repository.GetDetailArticleById(articleId);

if (article is null)
{
    throw new NotFoundException("Bài viết không tồn tại.");
}
```

Đây là best practice rất quan trọng:

- Repository trả dữ liệu hoặc `null`
- Service quyết định ý nghĩa nghiệp vụ của `null`
- Middleware quyết định cách trả HTTP response

Phân tầng như vậy sẽ sạch và dễ maintain hơn nhiều.

## 8. Middleware xử lý lỗi có giống `GlobalExceptionHandler` của Spring Boot không?

Có, về mặt ý tưởng thì rất giống. Nhưng cách framework vận hành có khác nhau.

## 9. Điểm giống nhau giữa ASP.NET Core và Spring Boot

Cả hai đều có chung mục tiêu:

- bắt lỗi tập trung tại một chỗ
- map exception sang status code
- chuẩn hóa JSON response
- tránh việc mỗi controller phải tự `try/catch`
- tách lỗi nghiệp vụ ra khỏi lỗi hệ thống

Ví dụ trong Spring Boot, bạn thường viết:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFound(NotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.fail(ex.getMessage()));
    }
}
```

Trong ASP.NET Core, vai trò tương tự nằm ở middleware:

```csharp
catch (Exception exception)
{
    LogException(exception);
    await HandleExceptionAsync(context, exception);
}
```

## 10. Khác nhau giữa ASP.NET Core middleware và Spring Boot global exception handler

### 10.1. ASP.NET Core middleware

Middleware nằm trong HTTP pipeline rất sớm.

Nó có thể:

- bắt exception từ middleware phía sau
- bắt exception từ authentication/authorization
- bắt exception từ controller
- sửa request/response
- short-circuit pipeline

Tức là middleware không chỉ dành cho exception. Nó là một cơ chế nền tảng của pipeline.

### 10.2. Spring Boot `@RestControllerAdvice`

`@RestControllerAdvice` thường nằm gần tầng MVC/DispatcherServlet hơn.

Nó chủ yếu:

- bắt exception phát sinh trong controller flow
- map exception thành response
- tập trung vào MVC exception handling

Nó không hoàn toàn là một pipeline wrapper tổng quát như ASP.NET Core middleware.

### 10.3. Cách nghĩ đơn giản

Có thể nhớ như sau:

- ASP.NET Core middleware giống một lớp bao quanh toàn bộ request pipeline
- Spring Boot `@RestControllerAdvice` giống một global exception resolver ở tầng web MVC

Nếu muốn một thứ gần hơn với ASP.NET middleware trong Spring, bạn sẽ nghĩ tới:

- Servlet Filter
- OncePerRequestFilter
- HandlerInterceptor

Nói ngắn gọn:

- `ASP.NET Core Middleware` gần với `Filter` của Spring hơn
- `GlobalExceptionMiddleware` về mục tiêu lại gần với `@RestControllerAdvice`

Nó giống nhau về mục tiêu xử lý lỗi tập trung, nhưng không giống hẳn về vị trí trong framework.

## 11. Nên dùng middleware hay exception filter?

Trong ASP.NET Core có vài cách xử lý lỗi:

- custom middleware
- `UseExceptionHandler`
- MVC exception filters
- `IExceptionHandler` ở các phiên bản .NET mới

Với API backend như project này, middleware là một lựa chọn rất tốt vì:

- hoạt động toàn cục
- không phụ thuộc riêng vào MVC
- bắt được lỗi từ nhiều tầng hơn
- dễ chuẩn hóa response

Exception filter phù hợp hơn khi:

- bạn chỉ muốn tác động ở tầng MVC
- bạn muốn áp dụng theo controller/action

Nếu mục tiêu là "mọi lỗi HTTP response đều cùng format", middleware thường là điểm bắt đầu tốt nhất.

## 12. Best practices xử lý lỗi trong middleware

Đây là phần rất quan trọng.

### 12.1. Đặt middleware exception càng sớm càng tốt

Nếu đặt quá muộn, exception của các middleware trước nó sẽ không được bắt.

Thực tế tốt:

```csharp
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

### 12.2. Không log full stack trace cho lỗi nghiệp vụ dự kiến

Ví dụ `NotFoundException`, `ValidationException`, `UnauthorizedAccessException` không phải lỗi hệ thống.

Nếu log `Error` đầy đủ cho các lỗi này:

- console sẽ rất nhiễu
- khó nhìn ra lỗi thật sự nguy hiểm
- production logs bị spam

Tốt hơn:

- log `Warning` hoặc `Information`
- chỉ log `Error` cho lỗi không mong đợi

### 12.3. Không lộ stack trace cho client

Không nên trả trực tiếp:

- stack trace
- inner exception
- SQL details
- connection string
- file path nội bộ

Client chỉ nên nhận:

- status code
- message phù hợp
- mã lỗi nếu cần
- danh sách validation errors nếu có

### 12.4. Phân biệt lỗi nghiệp vụ và lỗi hệ thống

Ví dụ:

- `NotFoundException` là lỗi nghiệp vụ
- `ValidationException` là lỗi nghiệp vụ
- `ConflicException` là lỗi nghiệp vụ
- `NullReferenceException` là lỗi hệ thống
- `InvalidOperationException` do bug code là lỗi hệ thống

Việc phân nhóm này quyết định:

- log level
- status code
- message trả về

### 12.5. Repository không nên tự biến "không tìm thấy dữ liệu" thành lỗi hệ thống

Đây là điểm project vừa gặp phải.

Không nên:

- dùng `FirstAsync()` nếu business chấp nhận không có dữ liệu
- dùng `SingleAsync()` nếu chưa chắc chắn record tồn tại

Nên:

- dùng `FirstOrDefaultAsync()`
- dùng `SingleOrDefaultAsync()` khi logic yêu cầu tối đa một bản ghi
- để service quyết định có ném `NotFoundException` hay không

### 12.6. Dùng custom exception rõ nghĩa

Thay vì ném `Exception` chung chung, nên tạo exception chuyên biệt:

```csharp
public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message)
    {
    }
}
```

Các loại thường gặp:

- `NotFoundException`
- `ValidationException`
- `ForbiddenException`
- `ConflictException`
- `UnauthorizedException`
- `BusinessRuleException`

### 12.7. Giữ format response lỗi thống nhất

Project hiện có `ApiResponse<T>`:

```csharp
public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public T? Data { get; init; }
    public DateTime ResponseTime { get; init; }
    public IEnumerable<string> Errors { get; init; } = Array.Empty<string>();
}
```

Điều này rất tốt vì frontend sẽ dễ xử lý:

- luôn có `success`
- luôn có `message`
- luôn có `errors`

### 12.8. Kiểm tra `context.Response.HasStarted`

Trong các hệ thống lớn, có thể response đã bắt đầu ghi xuống stream trước khi exception xảy ra. Khi đó không thể an toàn set lại status code hay write JSON mới.

Ví dụ cải tiến:

```csharp
if (context.Response.HasStarted)
{
    _logger.LogWarning("Cannot write error response because the response has already started.");
    throw;
}
```

Đây là một best practice rất đáng cân nhắc nếu app xử lý stream hoặc file lớn.

### 12.9. Bổ sung trace id hoặc correlation id

Khi production có lỗi, frontend báo lỗi nhưng backend cần tra log nhanh.

Rất nên đưa thêm:

- `HttpContext.TraceIdentifier`
- hoặc custom correlation id

Ví dụ response lỗi:

```json
{
  "success": false,
  "message": "An unexpected error occurred.",
  "errors": [],
  "traceId": "0HMTK123ABC:00000001"
}
```

### 12.10. Đừng lạm dụng middleware cho business logic nặng

Middleware nên dùng cho cross-cutting concerns.

Không nên nhét vào middleware các logic như:

- tạo bài viết
- tính điểm người dùng
- phân quyền nghiệp vụ theo entity phức tạp

Những phần đó nên ở service/application layer.

## 13. Một phiên bản middleware gợi ý hoàn chỉnh hơn

Ví dụ có thể mở rộng middleware hiện tại như sau:

```csharp
using System.Net;
using System.Text.Json;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Presentation.Middlewares;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogWarning(
                    exception,
                    "Cannot handle exception because the response has already started. TraceId: {TraceId}",
                    context.TraceIdentifier);
                throw;
            }

            LogException(context, exception);
            await HandleExceptionAsync(context, exception);
        }
    }

    private void LogException(HttpContext context, Exception exception)
    {
        switch (exception)
        {
            case ValidationException:
            case NotFoundException:
            case ConflicException:
            case AppException:
            case ArgumentException:
            case UnauthorizedAccessException:
                _logger.LogWarning(
                    "Handled exception: {ExceptionType} - {Message}. TraceId: {TraceId}",
                    exception.GetType().Name,
                    exception.Message,
                    context.TraceIdentifier);
                break;
            default:
                _logger.LogError(
                    exception,
                    "Unhandled exception. TraceId: {TraceId}",
                    context.TraceIdentifier);
                break;
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            ValidationException validationException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(validationException.Message, validationException.Errors)),
            NotFoundException notFoundException => (
                HttpStatusCode.NotFound,
                ApiResponse<object>.Fail(notFoundException.Message)),
            ConflicException conflicException => (
                HttpStatusCode.Conflict,
                ApiResponse<object>.Fail(conflicException.Message)),
            UnauthorizedAccessException unauthorizedAccessException => (
                HttpStatusCode.Forbidden,
                ApiResponse<object>.Fail(unauthorizedAccessException.Message)),
            ArgumentException argumentException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(argumentException.Message)),
            AppException appException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(appException.Message)),
            _ => (
                HttpStatusCode.InternalServerError,
                ApiResponse<object>.Fail("An unexpected error occurred."))
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response, JsonSerializerOptions));
    }
}
```

## 14. Hướng dẫn tự thiết kế custom exception cho nghiệp vụ

Một pattern dễ maintain là:

### 14.1. Tạo base exception

```csharp
public class AppException : Exception
{
    public AppException(string message) : base(message)
    {
    }
}
```

### 14.2. Tạo exception con theo từng ngữ nghĩa

```csharp
public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message)
    {
    }
}

public sealed class ValidationException : AppException
{
    public ValidationException(string message, IEnumerable<string>? errors = null)
        : base(message)
    {
        Errors = errors?.ToArray() ?? Array.Empty<string>();
    }

    public IReadOnlyCollection<string> Errors { get; }
}
```

### 14.3. Service chỉ cần throw đúng exception

```csharp
var article = await _repository.GetDetailArticleById(articleId);

if (article is null)
{
    throw new NotFoundException("Bài viết không tồn tại.");
}
```

### 14.4. Middleware map một lần duy nhất

```csharp
NotFoundException notFoundException => (
    HttpStatusCode.NotFound,
    ApiResponse<object>.Fail(notFoundException.Message))
```

Cách làm này có lợi:

- controller gọn
- service rõ ý nghĩa nghiệp vụ
- response đồng nhất
- dễ thêm loại exception mới

## 15. Hướng dẫn viết custom middleware cho từng nghiệp vụ

Không phải nghiệp vụ nào cũng nên dùng middleware. Middleware phù hợp nhất khi logic áp dụng cho nhiều endpoint hoặc toàn hệ thống.

### 15.1. Khi nào nên tạo custom middleware

Nên dùng middleware khi bạn cần:

- gắn correlation id cho mọi request
- đo thời gian xử lý request
- log request/response tổng quát
- kiểm tra header bắt buộc
- multi-tenant resolution từ header/domain
- chặn request theo IP/rate limit
- chuẩn hóa exception

Không nên dùng middleware khi logic cần dữ liệu application sâu như:

- kiểm tra quyền sửa bài viết theo `articleId`
- validate nội dung bài viết với AI
- cập nhật follower count

Các logic đó nên nằm ở service hoặc action filter/policy nếu phù hợp.

### 15.2. Mẫu middleware cơ bản

```csharp
public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var startedAt = DateTime.UtcNow;

        await _next(context);

        var elapsed = DateTime.UtcNow - startedAt;
        _logger.LogInformation(
            "Request {Method} {Path} responded {StatusCode} in {ElapsedMs} ms",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            elapsed.TotalMilliseconds);
    }
}
```

Đăng ký:

```csharp
app.UseMiddleware<RequestTimingMiddleware>();
```

### 15.3. Middleware kiểm tra header bắt buộc

Ví dụ bạn muốn mọi request từ internal client phải có `X-Client-Version`.

```csharp
public sealed class ClientVersionMiddleware
{
    private readonly RequestDelegate _next;

    public ClientVersionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue("X-Client-Version", out var version))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var response = ApiResponse<object>.Fail("Missing X-Client-Version header.");
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            return;
        }

        context.Items["ClientVersion"] = version.ToString();
        await _next(context);
    }
}
```

Middleware này phù hợp vì:

- logic áp dụng cho nhiều endpoint
- không phụ thuộc entity cụ thể
- có thể short-circuit sớm

### 15.4. Middleware correlation id

Ví dụ:

```csharp
public sealed class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString("N");

        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        await _next(context);
    }
}
```

Rất hữu ích khi:

- frontend báo lỗi
- backend cần lần log nhanh
- request đi qua nhiều service

### 15.5. Middleware multi-tenant đơn giản

Ví dụ hệ thống đọc tenant từ header:

```csharp
public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantId))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var response = ApiResponse<object>.Fail("Tenant header is required.");
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            return;
        }

        context.Items["TenantId"] = tenantId.ToString();
        await _next(context);
    }
}
```

Service hoặc controller phía sau có thể đọc:

```csharp
var tenantId = HttpContext.Items["TenantId"]?.ToString();
```

## 16. Cách tổ chức middleware trong dự án thực tế

Một cách tổ chức dễ maintain:

```text
Presentation/
  Middlewares/
    GlobalExceptionMiddleware.cs
    CorrelationIdMiddleware.cs
    RequestTimingMiddleware.cs
    TenantResolutionMiddleware.cs
```

Trong `Program.cs`, đăng ký theo thứ tự có chủ đích:

```csharp
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestTimingMiddleware>();

app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
```

Tư duy về thứ tự:

- correlation id nên rất sớm
- exception middleware nên sớm để bắt lỗi của phần sau
- request timing thường nên bao quanh phần lớn pipeline
- authentication/authorization nên đi trước controller

## 17. Các middleware có sẵn trong ASP.NET Core

ASP.NET Core có sẵn rất nhiều middleware quan trọng.

### 17.1. `UseExceptionHandler`

Middleware có sẵn của framework để xử lý lỗi toàn cục.

Thường dùng khi bạn muốn:

- redirect đến endpoint lỗi
- hoặc map lỗi tập trung theo cơ chế chuẩn của framework

Ví dụ:

```csharp
app.UseExceptionHandler("/error");
```

Hoặc kết hợp với `IExceptionHandler` trong .NET mới.

### 17.2. `UseDeveloperExceptionPage`

Hiển thị trang lỗi chi tiết khi phát triển.

Phù hợp cho local/dev, không dùng ở production.

### 17.3. `UseHttpsRedirection`

Tự động redirect HTTP sang HTTPS.

### 17.4. `UseStaticFiles`

Phục vụ file tĩnh như ảnh, css, js.

### 17.5. `UseRouting`

Thiết lập route matching trong các kiểu cấu hình pipeline cổ điển. Với minimal hosting ngày nay, nhiều trường hợp framework xử lý thuận tiện hơn, nhưng khái niệm routing middleware vẫn rất quan trọng.

### 17.6. `UseCors`

Áp chính sách CORS.

### 17.7. `UseAuthentication`

Đọc credential của request và thiết lập `HttpContext.User`.

### 17.8. `UseAuthorization`

Kiểm tra quyền truy cập dựa trên user đã được authenticate.

### 17.9. `UseRateLimiter`

Middleware rate limiting của ASP.NET Core cho các bản .NET mới.

### 17.10. `UseResponseCompression`

Nén response để giảm băng thông.

### 17.11. `UseOutputCache`

Caching response ở mức middleware.

## 18. Middleware có sẵn và custom middleware nên phối hợp thế nào?

Một cách nghĩ tốt là:

- Middleware có sẵn của framework lo hạ tầng chung
- Custom middleware lo các rule riêng của hệ thống bạn

Ví dụ thực tế:

- `UseHttpsRedirection`: framework lo HTTPS
- `UseCors`: framework lo cross-origin
- `UseAuthentication`: framework lo đọc token
- `GlobalExceptionMiddleware`: project lo format lỗi theo `ApiResponse`
- `CorrelationIdMiddleware`: project lo trace request
- `TenantResolutionMiddleware`: project lo multi-tenant business context

## 19. Khi nào nên dùng middleware, filter, policy, service?

Đây là chỗ rất hay bị nhầm.

### Dùng middleware khi:

- logic áp dụng rộng
- logic độc lập với controller cụ thể
- cần chạy sớm trong pipeline

### Dùng filter khi:

- logic gắn với MVC/action/controller
- cần hook vào lifecycle của action

### Dùng authorization policy khi:

- logic là phân quyền
- dựa trên claims, roles, requirements

### Dùng service khi:

- logic là nghiệp vụ thật sự
- cần thao tác entity, repository, domain rules

## 20. Một flow chuẩn nên áp dụng trong project này

Đối với các API nghiệp vụ như bài viết, user, community, có thể áp dụng flow:

1. Repository truy vấn dữ liệu bằng `FirstOrDefaultAsync` hoặc `SingleOrDefaultAsync` khi chấp nhận không có record.
2. Service kiểm tra dữ liệu và ném custom exception đúng ngữ nghĩa.
3. Middleware bắt exception và trả response chuẩn `ApiResponse`.
4. Frontend chỉ cần đọc `success`, `message`, `errors`, `status code`.

Ví dụ:

```csharp
var article = await _repository.GetDetailArticleById(articleId);

if (article is null)
{
    throw new NotFoundException("Bài viết không tồn tại.");
}

if (article.AuthorId != userId)
{
    throw new UnauthorizedAccessException("Bạn không có quyền xem bài viết này.");
}

return article;
```

Response trả về có thể là:

```json
{
  "success": false,
  "message": "Bài viết không tồn tại.",
  "data": null,
  "responseTime": "2026-05-17T13:00:00+07:00",
  "errors": []
}
```

## 21. Kết luận

Middleware trong ASP.NET Core là một cơ chế rất mạnh vì nó nằm ngay trong request pipeline. Với xử lý lỗi, middleware đóng vai trò tương tự một global exception handler, nhưng phạm vi tổng quát và mức can thiệp vào pipeline rộng hơn cách làm phổ biến với `@RestControllerAdvice` của Spring Boot.

Với project `SocialBackEnd`, hướng xử lý hiện tại là hợp lý:

- repository trả `null` khi không có dữ liệu
- service ném custom exception theo nghiệp vụ
- middleware map exception sang HTTP response chuẩn
- lỗi nghiệp vụ log nhẹ, lỗi hệ thống log mạnh

Nếu tiếp tục mở rộng project, bạn nên ưu tiên thêm:

- `HasStarted` guard
- correlation id
- chuẩn hóa thêm các custom exception như `ForbiddenException`
- rà soát repository để tránh `FirstAsync` và `SingleAsync` ở các case chấp nhận không có dữ liệu

Đây là nền tảng rất tốt để hệ thống vừa sạch về kiến trúc, vừa dễ debug, vừa thân thiện với frontend.
