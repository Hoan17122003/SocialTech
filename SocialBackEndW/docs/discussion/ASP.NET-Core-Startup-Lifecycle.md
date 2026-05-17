# ASP.NET Core Startup Lifecycle

Tài liệu này giải thích thật chi tiết quá trình khởi động của một ứng dụng ASP.NET Core, từ lúc process được chạy cho đến khi request đầu tiên đi vào controller. Mục tiêu là giúp bạn không chỉ "biết dùng" `Program.cs`, mà còn hiểu framework đang làm gì phía sau.

Tài liệu bám theo project hiện tại `SocialBackEnd`, đặc biệt là file `Program.cs`, nhưng phần giải thích được viết theo góc nhìn tổng quát để bạn áp dụng cho các project ASP.NET Core khác.

## 1. Mục tiêu của quá trình khởi động

Khi ứng dụng ASP.NET Core khởi động, framework cần làm được các việc chính sau:

1. Tạo host để chạy ứng dụng.
2. Nạp configuration từ nhiều nguồn.
3. Khởi tạo logging.
4. Tạo dependency injection container.
5. Đăng ký các service của framework và của project.
6. Build ứng dụng web hoàn chỉnh.
7. Cấu hình request pipeline bằng middleware.
8. Bind cổng mạng và bắt đầu lắng nghe HTTP request.
9. Với mỗi request đi vào, chạy request qua pipeline rồi trả response.

Nếu nhìn ở mức rất cao, toàn bộ flow sẽ như sau:

```text
dotnet run / app.exe
        |
        v
Create Host
        |
        v
Load Configuration + Logging + Environment
        |
        v
Register Services into DI Container
        |
        v
Build WebApplication
        |
        v
Configure Middleware Pipeline
        |
        v
Start Web Server (Kestrel)
        |
        v
Receive HTTP Requests
        |
        v
Execute Middleware -> Endpoint -> Response
```

## 2. ASP.NET Core thực chất là gì?

Nói ngắn gọn:

- `.NET` là runtime và platform tổng quát
- `ASP.NET Core` là framework web chạy trên `.NET`

Bạn có thể hình dung:

```text
Application code
    runs on
ASP.NET Core
    runs on
.NET Runtime
    runs on
Operating System
```

Trong project backend của bạn:

- business logic nằm trong `Application`, `Domain`, `Infrastructure`, `Presentation`
- web framework điều phối request/response là `ASP.NET Core`
- runtime thực thi là `.NET`

## 3. `Program.cs` là điểm vào của ứng dụng

Trong project hiện tại:

```csharp
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        ...
        var app = builder.Build();
        ...
        app.Run();
    }
}
```

Đây là entry point của process.

Khi bạn chạy:

```powershell
dotnet run
```

hoặc deploy app rồi chạy executable, hệ điều hành sẽ gọi vào `Main`.

Từ góc nhìn framework:

1. `Main` bắt đầu chạy.
2. `CreateBuilder` thiết lập toàn bộ nền tảng để cấu hình app.
3. `Build` kết tinh mọi cấu hình thành một ứng dụng chạy được.
4. `Run` khởi động web server và chờ request.

## 4. Giai đoạn 1: Process được tạo

Trước khi vào `Program.cs`, hệ điều hành đã tạo process cho ứng dụng.

Ở giai đoạn này:

- executable hoặc `dotnet` host được tải vào bộ nhớ
- CLR của .NET khởi động
- assemblies được load dần khi cần
- runtime chuẩn bị gọi entry point

Bạn thường không code trực tiếp ở tầng này, nhưng hiểu nó giúp bạn thấy rằng:

- `Program.cs` không phải thứ đầu tiên của cả hệ thống
- nó là thứ đầu tiên bạn kiểm soát trong application layer của backend

## 5. Giai đoạn 2: `WebApplication.CreateBuilder(args)`

Đây là một trong những lệnh quan trọng nhất của ASP.NET Core hiện đại.

```csharp
var builder = WebApplication.CreateBuilder(args);
```

Bạn có thể hiểu câu lệnh này như:

"Hãy tạo cho tôi một môi trường dựng web app, bao gồm host, configuration, logging, service collection và các mặc định quan trọng."

### 5.1. `builder` là gì?

`builder` là một object trung tâm giúp bạn cấu hình app trước khi app thực sự được build.

Nó thường cho bạn truy cập vào:

- `builder.Configuration`
- `builder.Services`
- `builder.Logging`
- `builder.Environment`
- `builder.Host`
- `builder.WebHost`

Hình dung:

```text
WebApplicationBuilder
|
|-- Configuration
|-- Services
|-- Logging
|-- Environment
|-- Host settings
|-- WebHost settings
```

### 5.2. `CreateBuilder` làm những gì phía sau?

Nó làm rất nhiều việc nền tảng:

1. Tạo host builder.
2. Xác định environment như `Development`, `Staging`, `Production`.
3. Nạp configuration mặc định.
4. Thiết lập logging mặc định.
5. Tạo `IServiceCollection`.
6. Chuẩn bị web server mặc định là Kestrel.
7. Thiết lập integration với DI, routing, options, logging, hosting lifetime.

Nói cách khác, `CreateBuilder` là bước "dựng xưởng" để bạn lắp các thành phần vào.

## 6. Giai đoạn 3: Configuration được nạp như thế nào?

Trong ASP.NET Core, configuration là một hệ thống hợp nhất nhiều nguồn dữ liệu.

Ví dụ các nguồn thường gặp:

- `appsettings.json`
- `appsettings.{Environment}.json`
- environment variables
- command-line arguments
- user secrets
- custom providers

Project của bạn còn có:

```csharp
builder.AddDotEnvFile();
```

Tức là có thêm một lớp nạp biến môi trường từ file `.env`.

### 6.1. `builder.Configuration` là gì?

Đây là nơi hợp nhất tất cả key-value config mà app có thể đọc.

Ví dụ:

```csharp
builder.Configuration.GetSection("RedisCacheSettings:Configuration").Value;
```

nghĩa là app đang đọc config Redis từ cây configuration chung.

### 6.2. Thứ tự ưu tiên config

Thực tế, ASP.NET Core áp dụng thứ tự ưu tiên. Nguồn nạp sau thường có thể override nguồn nạp trước.

Ví dụ tư duy phổ biến:

```text
appsettings.json
    < appsettings.Development.json
    < environment variables
    < command line arguments
```

Điều này rất quan trọng vì:

- local dev có thể dùng file json
- production có thể override bằng env vars

### 6.3. Tại sao configuration lại mạnh?

Vì bạn không cần hardcode mọi thứ vào code.

Bạn có thể đổi:

- connection string
- Redis config
- JWT settings
- CORS origins
- SMTP settings

mà không phải sửa business logic.

## 7. Giai đoạn 4: Environment được xác định

ASP.NET Core luôn quan tâm app đang chạy ở môi trường nào.

Các môi trường phổ biến:

- `Development`
- `Staging`
- `Production`

Trong project:

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

Điều này nghĩa là:

- nếu đang ở `Development`, bật Swagger
- nếu là `Production`, phần này không chạy

### 7.1. Environment ảnh hưởng gì?

Nó có thể ảnh hưởng đến:

- file config được load
- mức logging
- middleware dev-only
- behavior debug
- hiển thị chi tiết lỗi

### 7.2. Tư duy rất quan trọng

Không phải mọi code đều nên chạy ở mọi môi trường.

Ví dụ:

- Swagger UI có thể chỉ cần trong dev
- Developer exception page chỉ nên có ở dev
- thông tin nhạy cảm không nên lộ ở production

## 8. Giai đoạn 5: Logging được khởi tạo

ASP.NET Core có logging infrastructure tích hợp sẵn.

Mục tiêu của logging:

- ghi lại trạng thái app khi startup
- log request/response
- log warning và error
- hỗ trợ debug production

### 8.1. `ILogger<T>` đến từ đâu?

Ví dụ trong middleware của bạn:

```csharp
private readonly ILogger<GlobalExceptionMiddleware> _logger;
```

Logger này được framework inject qua DI.

Điều đó chỉ hoạt động vì từ lúc startup, ASP.NET Core đã chuẩn bị logging services.

### 8.2. Logging tham gia vào startup như thế nào?

Trong quá trình startup:

1. Logging providers được tạo.
2. Mức log được đọc từ config.
3. Các service có thể inject `ILogger<T>`.
4. Khi app chạy, bất kỳ component nào cũng có thể ghi log.

Bạn có thể xem logging như hạ tầng xuyên suốt toàn app.

## 9. Giai đoạn 6: Dependency Injection container được chuẩn bị

ASP.NET Core dùng built-in DI container.

Trong startup, một trong những việc lớn nhất là đăng ký services.

Trong project hiện tại:

```csharp
builder.Services.AddControllers();
builder.Services.AddCors(...);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(...);
builder.Services.AddServiceDependencies(builder.Configuration);
builder.Services.AddRepositoryDependencies(builder.Configuration);
builder.Services.AddSecurityConfiguration(builder.Configuration);
builder.Services.AddStackExchangeRedisCache(...);
```

### 9.1. `builder.Services` là gì?

Đây là `IServiceCollection`, tức danh sách đăng ký service.

Bạn có thể hình dung:

```text
IServiceCollection
|
|-- "Khi ai cần IArticlePort -> dùng ArticleAdapterPort"
|-- "Khi ai cần ILogger<T> -> framework cung cấp logger"
|-- "Khi ai cần cache -> framework tạo cache service"
|-- "Khi ai cần DbContext -> tạo AppDbContext"
```

### 9.2. DI giúp gì?

Thay vì tự new mọi object bằng tay:

```csharp
var repository = new PostRepository(...);
var service = new ArticleAdapterPort(repository, ...);
var controller = new ArticleController(service);
```

framework sẽ tự quản lý object graph này.

Lợi ích:

- ít coupling
- dễ test
- dễ thay implementation
- dễ quản lý lifetime

### 9.3. Các lifetime quan trọng

Thường có 3 loại:

- `Singleton`: một instance cho toàn app
- `Scoped`: một instance cho mỗi HTTP request
- `Transient`: tạo mới mỗi lần inject

Ví dụ tư duy phổ biến:

- config providers thường là singleton
- repository hoặc DbContext thường scoped
- utility stateless có thể transient

## 10. Giai đoạn 7: Đăng ký framework services

Những dòng như:

```csharp
builder.Services.AddControllers();
builder.Services.AddCors(...);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(...);
```

không chỉ là "bật tính năng". Chúng thực sự đăng ký rất nhiều thành phần nội bộ vào DI container.

### 10.1. `AddControllers()`

Lệnh này thêm những thành phần cần thiết cho ASP.NET Core MVC/API:

- controller discovery
- model binding
- validation
- action invocation
- formatter JSON
- filters infrastructure

Nếu không có `AddControllers()`, app không có đủ nền tảng để map controller endpoints.

### 10.2. `AddCors(...)`

Lệnh này đăng ký CORS services và chính sách `FrontendDev`.

Sau đó khi pipeline chạy `app.UseCors("FrontendDev")`, middleware CORS mới có dữ liệu để áp dụng.

### 10.3. `AddEndpointsApiExplorer()`

Đây là service giúp API metadata có thể được khám phá để phục vụ Swagger/OpenAPI.

### 10.4. `AddSwaggerGen(...)`

Đăng ký generator để tạo OpenAPI schema từ controllers, routes, DTOs, security definitions.

Trong project bạn còn cấu hình thêm Bearer token cho Swagger UI.

## 11. Giai đoạn 8: Đăng ký services của application

Các extension method:

```csharp
builder.Services.AddServiceDependencies(builder.Configuration);
builder.Services.AddRepositoryDependencies(builder.Configuration);
builder.Services.AddSecurityConfiguration(builder.Configuration);
```

là một pattern rất hay.

### 11.1. Vì sao nên gom vào extension method?

Nếu viết hết trong `Program.cs`, file này sẽ phình rất nhanh.

Khi gom vào extension:

- `Program.cs` gọn hơn
- logic đăng ký service được nhóm theo domain
- dễ bảo trì

### 11.2. Ví dụ tư duy

```text
DependencyInjection/
|
|-- ServiceDependencyInjection.cs
|-- RepositoryDependencyInjection.cs

Infrastructure/Security/
|
|-- SecurityConfigurationExtensions.cs
```

Mỗi extension sẽ chịu trách nhiệm một mảng.

Đây là dấu hiệu của codebase đang đi theo hướng tổ chức tốt.

## 12. Giai đoạn 9: Security được cấu hình

Dòng này rất quan trọng:

```csharp
builder.Services.AddSecurityConfiguration(builder.Configuration);
```

Thường trong một project ASP.NET Core API, phần này sẽ:

- bind JWT options
- tạo authentication scheme
- cấu hình token validation parameters
- bật authorization
- có thể thêm policies, requirements, handlers

Khi đó, sau này ở pipeline:

```csharp
app.UseSecurityConfiguration();
```

thì request mới thực sự đi qua authentication và authorization middleware.

Rất nhiều người mới hay nhầm rằng chỉ `Add...` là đủ. Thực tế:

- `Add...` là đăng ký service vào DI container
- `Use...` là đưa logic đó vào request pipeline

Đây là một phân biệt cực kỳ quan trọng.

## 13. Giai đoạn 10: Cache, database, hạ tầng ngoài

Ví dụ:

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetSection("RedisCacheSettings:Configuration").Value;
});
```

Đây là lúc bạn cấu hình các dependency ngoài như:

- Redis
- SQL Server / MySQL / PostgreSQL
- Kafka
- SMTP
- MinIO

Những cấu hình này thường phụ thuộc vào configuration đã nạp ở các bước trước.

Điều đó cho thấy startup không chỉ là "khởi động web", mà còn là giai đoạn lắp ghép toàn bộ hệ sinh thái hạ tầng mà app sẽ dùng.

## 14. Giai đoạn 11: `builder.Build()`

Đây là mốc rất quan trọng:

```csharp
var app = builder.Build();
```

Bạn có thể hiểu:

"Hãy lấy toàn bộ cấu hình host, services, logging, configuration, web server settings và biến chúng thành một ứng dụng web hoàn chỉnh có thể chạy."

### 14.1. Trước `Build`

Trước `Build`, bạn đang ở giai đoạn cấu hình.

```text
builder.Services.Add...
builder.Configuration...
builder.Logging...
```

Bạn đang nói với framework:

- app sẽ có những service nào
- app sẽ dùng config nào
- app sẽ có những behavior nền tảng nào

### 14.2. Sau `Build`

Sau `Build`, bạn có `app`, tức là `WebApplication`.

Lúc này:

- DI container đã được dựng
- service provider chính đã sẵn sàng
- app chuẩn bị nhận middleware registrations

### 14.3. Điều gì thay đổi về mặt tư duy?

Trước `Build`:

- bạn "khai báo" hệ thống sẽ được lắp như thế nào

Sau `Build`:

- bạn "xếp đường đi" cho request bằng middleware

Đây là hai pha rất khác nhau.

## 15. Sơ đồ lớn của startup

Đây là sơ đồ quan trọng nhất để bạn nhớ:

```text
Phase A: Bootstrap
------------------------------------------
Main()
  -> WebApplication.CreateBuilder(args)
  -> load config
  -> detect environment
  -> setup logging
  -> create IServiceCollection

Phase B: Registration
------------------------------------------
builder.Services.AddControllers()
builder.Services.AddCors()
builder.Services.AddSwaggerGen()
builder.Services.AddCustomDependencies()
builder.Services.AddSecurityConfiguration()

Phase C: Build
------------------------------------------
var app = builder.Build();

Phase D: Pipeline
------------------------------------------
app.UseMiddleware<GlobalExceptionMiddleware>()
app.UseSwagger()
app.UseHttpsRedirection()
app.UseStaticFiles()
app.UseCors()
app.UseAuthentication()
app.UseAuthorization()
app.MapControllers()

Phase E: Run
------------------------------------------
app.Run();
```

## 16. Giai đoạn 12: Middleware pipeline được cấu hình

Sau `Build`, bạn bắt đầu viết:

```csharp
app.UseMiddleware<GlobalExceptionMiddleware>();
...
app.UseHttpsRedirection();
app.UseStaticFiles(...);
app.UseCors("FrontendDev");
app.UseSecurityConfiguration();
app.MapControllers();
```

Đây là lúc bạn định nghĩa đường đi của request.

### 16.1. `Use...` nghĩa là gì?

`Use...` thường thêm một middleware vào pipeline.

Middleware này có thể:

- làm gì đó trước request
- gọi middleware sau qua `_next`
- làm gì đó sau khi middleware sau trả về

Ví dụ ý tưởng:

```text
Request
 -> GlobalExceptionMiddleware
 -> Swagger
 -> HttpsRedirection
 -> StaticFiles
 -> Cors
 -> Authentication
 -> Authorization
 -> Controller endpoint
```

### 16.2. Tại sao thứ tự middleware quan trọng?

Vì request sẽ đi theo đúng thứ tự bạn đăng ký.

Ví dụ:

- exception middleware nên ở sớm để bắt lỗi của phần sau
- authentication phải chạy trước authorization
- static files thường nên chạy trước MVC nếu muốn file được trả trực tiếp

Middleware order là một trong những kiến thức quan trọng nhất của ASP.NET Core.

## 17. Giai đoạn 13: `MapControllers()`

```csharp
app.MapControllers();
```

Lệnh này không đơn thuần là "bật controller". Nó map các controller actions thành endpoints trong hệ thống routing/endpoint execution.

Bạn có thể hình dung:

```text
ArticleController.GetDetailArticle
    -> route: GET /api/article/detail/{articleId}

AuthController.Login
    -> route: POST /api/auth/login
```

Khi request đến:

1. Routing xác định endpoint phù hợp.
2. ASP.NET Core tạo controller instance qua DI.
3. Model binding bind route/query/body/header vào parameters.
4. Action được gọi.
5. Kết quả action được chuyển thành HTTP response.

## 18. Giai đoạn 14: `app.Run()`

Đây là khoảnh khắc app thật sự bắt đầu sống.

```csharp
app.Run();
```

Bạn có thể hiểu câu này là:

"Hãy khởi động web host, bật web server, bind cổng, và bắt đầu lắng nghe request."

### 18.1. `Run()` làm gì?

Nó thường:

- hoàn tất startup
- khởi động server như Kestrel
- bắt đầu event loop chờ HTTP requests
- giữ process sống cho tới khi app bị shutdown

Sau `Run()`, code phía dưới thường không chạy tiếp theo kiểu tuyến tính bình thường, vì app đang ở trạng thái phục vụ request liên tục.

## 19. Kestrel là gì?

Kestrel là web server mặc định của ASP.NET Core.

Bạn có thể hình dung:

```text
Internet / Browser / Client
          |
          v
       Kestrel
          |
          v
 ASP.NET Core Middleware Pipeline
          |
          v
      Controller / Endpoint
```

Nó chịu trách nhiệm ở mức thấp hơn:

- mở socket
- lắng nghe cổng
- nhận request HTTP
- chuyển request vào ASP.NET Core pipeline
- ghi response trở lại client

Nói dễ hiểu:

- Kestrel là "web server engine"
- ASP.NET Core là "web framework"
- app của bạn là "business application"

## 20. Request đầu tiên đi qua app như thế nào?

Sau startup, khi request đầu tiên đến:

```text
Client Request
    |
    v
Kestrel receives request
    |
    v
HttpContext created
    |
    v
Request enters middleware pipeline
    |
    v
Routing finds endpoint
    |
    v
Controller created via DI
    |
    v
Action executes
    |
    v
Result converted to HTTP response
    |
    v
Response leaves pipeline
    |
    v
Kestrel sends response to client
```

### 20.1. `HttpContext` là gì?

Đây là object đại diện cho một HTTP request/response transaction.

Nó chứa:

- request
- response
- user
- headers
- items
- services của request scope
- trace identifier

Hầu như mọi middleware đều làm việc thông qua `HttpContext`.

## 21. Phân biệt 3 khái niệm cực kỳ quan trọng

Nhiều người mới học ASP.NET Core hay trộn 3 thứ này với nhau.

### 21.1. `Add...`

Ví dụ:

```csharp
builder.Services.AddControllers();
builder.Services.AddCors();
```

Ý nghĩa:

- đăng ký services vào DI container
- chuẩn bị năng lực cho app

### 21.2. `Use...`

Ví dụ:

```csharp
app.UseCors("FrontendDev");
app.UseAuthentication();
```

Ý nghĩa:

- thêm middleware vào request pipeline
- quyết định request chạy qua những bước nào

### 21.3. `Map...`

Ví dụ:

```csharp
app.MapControllers();
```

Ý nghĩa:

- khai báo endpoints cuối cùng mà request có thể đi tới

Bạn có thể nhớ:

```text
Add = đăng ký năng lực
Use = xếp luồng chạy
Map = nối request tới đích cuối
```

## 22. Vì sao `Program.cs` trong ASP.NET Core mới trông ngắn hơn trước?

Ở các phiên bản ASP.NET Core cũ hơn, bạn thường thấy:

- `Program.cs`
- `Startup.cs`

Hiện nay mô hình tối giản hơn:

- nhiều cấu hình dồn vào `Program.cs`
- gọi là minimal hosting model

Nhưng về bản chất, các khái niệm vẫn tương tự:

- xây host
- đăng ký services
- cấu hình middleware
- chạy app

Chỉ là API được làm gọn và ít ceremony hơn.

## 23. Điều gì xảy ra khi framework tạo controller?

Giả sử có:

```csharp
public class ArticleController : ControllerBase
{
    private readonly IArticlePort _articlePort;

    public ArticleController(IArticlePort articlePort)
    {
        _articlePort = articlePort;
    }
}
```

Khi request match tới action của controller này:

1. ASP.NET Core hỏi DI container cách tạo `ArticleController`.
2. DI container thấy controller cần `IArticlePort`.
3. DI container tra registration.
4. Nó tạo implementation tương ứng.
5. Nếu implementation đó lại cần repository, logger, cache, event publisher, DI tiếp tục tạo các dependency con.
6. Khi object graph hoàn tất, controller được khởi tạo.

Hình dung:

```text
ArticleController
    needs IArticlePort
        needs IPostRepository
        needs ILogger<ArticleAdapterPort>
        needs IEntityMediaStorageService
        needs IAttachmentRepository
        needs IApplicationEventPublisher
        needs IGeminiArticlePort
```

DI container giải quyết cây phụ thuộc này tại runtime.

## 24. Startup và lifetime của service có liên hệ thế nào?

Rất nhiều service không được tạo ngay lúc startup.

Ví dụ:

- đăng ký `Scoped` không có nghĩa instance được tạo ngay
- nó chỉ có nghĩa framework biết cách tạo nó khi request cần

Tức là startup thường là giai đoạn:

- đăng ký "công thức tạo object"

chứ không phải luôn luôn tạo hết object ngay lập tức.

Điều này giúp:

- startup nhẹ hơn
- tiết kiệm tài nguyên
- chỉ khởi tạo khi cần

Tuy nhiên một số singleton hoặc hosted services có thể được tạo sớm hơn tùy loại service.

## 25. Hosted services và background work

ASP.NET Core host không chỉ chạy HTTP.

Nó còn có thể chạy background services như:

- Kafka consumers
- scheduled jobs
- queue processors

Những thành phần này thường dùng:

- `IHostedService`
- `BackgroundService`

Chúng được host khởi động và dừng cùng vòng đời ứng dụng.

Đây là lý do khái niệm `Host` rộng hơn chỉ mỗi web request.

## 26. Shutdown lifecycle cũng quan trọng

Một ứng dụng ASP.NET Core không chỉ có startup mà còn có shutdown lifecycle.

Khi app dừng:

- host nhận tín hiệu shutdown
- server ngừng nhận request mới
- các request đang xử lý có thể được cho thời gian hoàn tất
- hosted services được stop
- resources được dispose

Điều này quan trọng khi làm việc với:

- database connections
- Kafka consumers
- file handles
- sockets
- telemetry exporters

## 27. Cách đọc `Program.cs` của project hiện tại theo tư duy framework

Đây là cách bạn nên nhìn file `Program.cs` của `SocialBackEnd`.

### 27.1. Phần đầu: chuẩn bị builder

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddDotEnvFile();
```

Ý nghĩa:

- dựng host builder
- nạp config nền tảng
- thêm `.env`

### 27.2. Phần giữa: đăng ký services

```csharp
builder.Services.AddControllers();
builder.Services.AddCors(...);
builder.Services.AddSwaggerGen(...);
builder.Services.AddServiceDependencies(...);
builder.Services.AddRepositoryDependencies(...);
builder.Services.AddSecurityConfiguration(...);
builder.Services.AddStackExchangeRedisCache(...);
```

Ý nghĩa:

- đăng ký toàn bộ framework services và application services
- chuẩn bị các dependency để request sau này có thể chạy

### 27.3. `Build`

```csharp
var app = builder.Build();
```

Ý nghĩa:

- kết tinh phần cấu hình thành web app thực thi được

### 27.4. Phần sau `Build`: pipeline

```csharp
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.UseStaticFiles(...);
app.UseCors("FrontendDev");
app.UseSecurityConfiguration();
app.MapControllers();
```

Ý nghĩa:

- xác định thứ tự middleware
- map endpoints

### 27.5. `Run`

```csharp
app.Run();
```

Ý nghĩa:

- start server
- chờ request

## 28. Một sơ đồ tổng hợp đầy đủ hơn

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. Process starts                                           │
│    dotnet run / executable launch                           │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 2. Entry point                                               │
│    Program.Main(args)                                        │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 3. Create builder                                            │
│    WebApplication.CreateBuilder(args)                        │
│    - host setup                                              │
│    - config setup                                            │
│    - logging setup                                           │
│    - environment detection                                   │
│    - service collection creation                             │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 4. Register services                                         │
│    builder.Services.Add...                                   │
│    - controllers                                             │
│    - swagger                                                 │
│    - cors                                                    │
│    - security                                                │
│    - repositories                                            │
│    - redis                                                   │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 5. Build app                                                 │
│    var app = builder.Build();                                │
│    - service provider finalized                              │
│    - web application object created                          │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 6. Configure middleware pipeline                             │
│    app.Use... / app.Map...                                   │
│    - exception middleware                                    │
│    - swagger                                                 │
│    - https redirection                                       │
│    - static files                                            │
│    - cors                                                    │
│    - authentication                                          │
│    - authorization                                           │
│    - controller endpoints                                    │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 7. Run app                                                   │
│    app.Run();                                                │
│    - Kestrel starts                                          │
│    - ports are bound                                         │
│    - app waits for requests                                  │
└──────────────────────────────────────────────────────────────┘
                            |
                            v
┌──────────────────────────────────────────────────────────────┐
│ 8. Request lifecycle                                         │
│    request -> middleware -> endpoint -> response             │
└──────────────────────────────────────────────────────────────┘
```

## 29. Những hiểu lầm phổ biến của người mới học ASP.NET Core

### 29.1. Nghĩ rằng `Add...` là app đã chạy tính năng đó

Sai. `Add...` mới chỉ đăng ký service.

### 29.2. Nghĩ rằng `Build()` là bắt đầu lắng nghe request

Sai. `Build()` chỉ tạo app hoàn chỉnh. `Run()` mới làm app bắt đầu phục vụ request.

### 29.3. Nghĩ rằng middleware chỉ để xử lý lỗi

Sai. Middleware là cơ chế tổng quát của pipeline.

### 29.4. Nghĩ rằng controller được tạo sẵn hết lúc startup

Không phải. Thường controller được tạo khi request cần.

### 29.5. Nghĩ rằng mọi service đều instantiate ngay khi đăng ký

Không đúng. Phần lớn chỉ đăng ký công thức tạo, chưa tạo instance ngay.

## 30. Cách học ASP.NET Core hiệu quả nhất từ đây

Nếu muốn hiểu framework thật chắc, bạn nên học theo thứ tự:

1. `Program.cs` và startup lifecycle
2. DI container và service lifetimes
3. Middleware pipeline
4. Routing và endpoint execution
5. Controller, model binding, validation
6. Authentication và authorization
7. Exception handling
8. Logging, configuration, options pattern
9. Hosted services và background processing

Đây là thứ tự giúp bạn hiểu framework từ "gốc điều phối" trước, rồi mới đi vào từng chức năng.

## 31. Kết luận

Khi làm việc với ASP.NET Core, `Program.cs` chỉ là phần nổi dễ thấy nhất. Bên dưới nó là cả một chuỗi cơ chế của framework:

- host
- configuration
- environment
- logging
- dependency injection
- middleware pipeline
- routing
- endpoint execution
- web server

Nếu nhớ một câu duy nhất, hãy nhớ câu này:

```text
CreateBuilder = dựng nền tảng
Add...        = đăng ký năng lực
Build         = kết tinh thành app
Use.../Map... = xếp đường đi của request
Run           = bắt đầu sống và lắng nghe request
```

Khi nắm được chuỗi này, bạn sẽ đọc `Program.cs` rất khác:

- không còn thấy đó là vài dòng cấu hình rời rạc
- mà thấy đó là toàn bộ kiến trúc khởi động và điều phối của ứng dụng web ASP.NET Core

Đó là một cột mốc rất quan trọng để đi từ mức "dùng framework" sang mức "hiểu framework".
