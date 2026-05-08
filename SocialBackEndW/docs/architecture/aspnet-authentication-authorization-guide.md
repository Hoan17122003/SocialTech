# Authentication, Authorization và Phân Quyền Trong ASP.NET

Tài liệu này được viết theo góc nhìn của người đã quen với Java Spring Boot, để bạn map tư duy từ `FilterChain` sang pipeline của ASP.NET Core.

## 1. Bối cảnh tổng quan

Trong ASP.NET Core, `authentication` và `authorization` là 2 tầng khác nhau:

- `Authentication`: xác thực "bạn là ai?"
- `Authorization`: kiểm tra "bạn được phép làm gì?"

Nói gọn:

- Authentication tạo ra `ClaimsPrincipal` và gán vào `HttpContext.User`
- Authorization đọc `HttpContext.User`, policy, role, claim, resource... để quyết định có cho đi tiếp hay không

Trong một request thông thường:

1. Client gửi request kèm credential
2. ASP.NET chạy qua middleware pipeline
3. Authentication middleware gọi `AuthenticationHandler` của scheme hiện tại
4. Handler validate credential và tạo `ClaimsPrincipal`
5. `HttpContext.User` được set
6. Authorization middleware/attribute (`[Authorize]`) kiểm tra role, policy, claim
7. Nếu hợp lệ thì action/endpoint được chạy

## 2. Những cách triển khai authentication phổ biến trong ASP.NET

ASP.NET Core hỗ trợ theo mô hình `authentication scheme`. Mỗi scheme là một cách xác thực.

### 2.1 Cookie Authentication

Dùng nhiều cho:

- MVC app
- Razor Pages
- web app server-rendered
- session login truyền thống

Cơ chế:

- User login thành công
- Server tạo auth cookie
- Các request sau gửi cookie lên
- Server giải mã/validate cookie để phục hồi identity

Thường đi cùng:

- ASP.NET Core Identity
- login form
- anti-forgery

### 2.2 JWT Bearer Authentication

Dùng nhiều cho:

- REST API
- SPA
- mobile app
- microservices

Cơ chế:

- Client login và nhận access token
- Mỗi request gửi `Authorization: Bearer <token>`
- Server verify signature, expiry, issuer, audience
- Tạo `ClaimsPrincipal` từ token claims

Đây là cách phổ biến nhất khi làm backend API.

### 2.3 OAuth 2.0 / OpenID Connect (OIDC)

Dùng khi:

- đăng nhập qua Google, Microsoft, GitHub
- tích hợp Keycloak, Auth0, Azure AD, Okta
- SSO doanh nghiệp

Cần tách rõ:

- OAuth2: ủy quyền truy cập tài nguyên
- OpenID Connect: xác thực danh tính ở tầng phía trên OAuth2

Trong ASP.NET:

- Web app thường dùng `AddOpenIdConnect()`
- API nhận access token thường dùng `AddJwtBearer()`

### 2.4 ASP.NET Core Identity

Đây không phải chỉ là "một auth type", mà là bộ framework sẵn cho:

- user store
- password hashing
- roles
- claims
- email confirm
- reset password
- lockout
- 2FA

Identity thường đi kèm:

- cookie auth cho web app
- hoặc kết hợp với JWT nếu bạn tự phát token cho API

### 2.5 Windows / Negotiate Authentication

Dùng trong môi trường enterprise / intranet:

- Active Directory
- Windows domain

Scheme thường gặp:

- Negotiate
- Kerberos
- NTLM

### 2.6 API Key / Custom Header Authentication

Dùng cho:

- service-to-service đơn giản
- internal API
- webhook xác thực basic

Thường sẽ cần custom `AuthenticationHandler`.

### 2.7 Certificate Authentication

Dùng cho:

- mutual TLS
- hệ thống nội bộ
- security level cao

## 3. Luồng chạy authentication trong ASP.NET Core

Đây là flow để bạn hình dung đúng:

```text
HTTP Request
  -> Middleware Pipeline
    -> UseRouting()
    -> UseAuthentication()
      -> AuthenticationService
      -> AuthenticationHandler của default scheme
      -> Tạo ClaimsPrincipal nếu hợp lệ
      -> Gán vào HttpContext.User
    -> UseAuthorization()
      -> AuthorizationMiddleware
      -> Xem metadata của endpoint ([Authorize], policy, role...)
      -> Đánh giá có đủ quyền không
    -> Endpoint / Controller Action
```

### Các thành phần chính

#### `AddAuthentication()`

Dùng để:

- khai báo default scheme
- đăng ký các auth scheme

Ví dụ:

```csharp
builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });
```

#### `UseAuthentication()`

Đây là middleware thực thi authentication.

Nếu bạn quên dòng này:

- `HttpContext.User` có thể rỗng
- `[Authorize]` sẽ không có principal đúng để kiểm tra

#### `UseAuthorization()`

Đây là middleware thực thi authorization.

Nó sẽ đọc:

- endpoint metadata
- role
- policy
- claim requirements

#### `[Authorize]` và `[AllowAnonymous]`

Đặt ở:

- controller
- action
- minimal API endpoint

Ví dụ:

```csharp
[Authorize]
[HttpGet("me")]
public IActionResult Me() => Ok();

[Authorize(Roles = "Admin")]
[HttpDelete("{id}")]
public IActionResult DeleteUser(int id) => Ok();

[AllowAnonymous]
[HttpPost("login")]
public IActionResult Login() => Ok();
```

## 4. ASP.NET khác gì với filter chain của Spring Boot?

Nếu bạn quen Spring Security, mapping tư duy như sau:

### 4.1 Mapping khái niệm

- `Servlet Filter Chain` trong Spring Boot ~ `Middleware Pipeline` trong ASP.NET Core
- `OncePerRequestFilter` ~ custom middleware hoặc custom auth handler tùy mục đích
- `SecurityContextHolder` ~ `HttpContext.User`
- `AuthenticationManager` ~ `IAuthenticationService` + auth handlers
- `UserDetails/UserDetailsService` ~ user store / service trả claims / identity store
- `AccessDecisionVoter` / authorization rules ~ `AuthorizationPolicy`, `IAuthorizationHandler`
- `@PreAuthorize` ~ policy-based authorization / resource-based authorization

### 4.2 Khác biệt quan trọng

#### ASP.NET auth được "đóng gói" mạnh hơn quanh scheme và handler

Trong Spring, bạn thường nghĩ theo filter chain và security context.

Trong ASP.NET, bạn thường nghĩ theo:

- scheme
- handler
- middleware
- policy

Tức là phần "credential parsing + validate + build principal" thường nằm trong `AuthenticationHandler`.

#### Authorization trong ASP.NET rất mạnh ở policy và requirement

Spring có expression-based authorization.

ASP.NET Core rất mạnh ở:

- policy-based authorization
- claim-based authorization
- role-based authorization
- resource-based authorization

#### Middleware order là rất quan trọng

Spring Security thường "bao" app bên trong 1 security chain.

ASP.NET là pipeline rõ ràng hơn, nên thứ tự là then chốt:

```csharp
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

Sai thứ tự là lỗi hành vi rất khó debug.

### 4.3 Cách nhớ nhanh

- Spring: nghĩ "request đi qua một bộ filter"
- ASP.NET: nghĩ "request đi qua middleware pipeline, trong đó auth là 1 cặp middleware + handler + policy engine"

## 5. Authentication vs Authorization vs Phân quyền

Ba khái niệm này dễ bị trộn:

### 5.1 Authentication

Trả lời câu hỏi:

- "Người này là ai?"

Dữ liệu đầu ra:

- `ClaimsPrincipal`
- claims như `sub`, `name`, `email`, `role`, `permission`

### 5.2 Authorization

Trả lời câu hỏi:

- "Người này có được truy cập endpoint này không?"

Dữ liệu đầu vào:

- `HttpContext.User`
- role
- claim
- policy
- resource

### 5.3 Phân quyền

Trong thực tế "phân quyền" thường là business design phía trên authorization. Có vài mô hình:

- Role-based access control (RBAC)
- Claim-based access control
- Permission-based access control
- Resource-based access control

Senior thường không dùng role thuần túy cho mọi thứ, vì role dễ bị phình to.

## 6. Các kiểu authorization trong ASP.NET

### 6.1 Role-based Authorization

Ví dụ:

```csharp
[Authorize(Roles = "Admin")]
public IActionResult AdminOnly() => Ok();
```

Ưu điểm:

- dễ hiểu
- dễ demo

Nhược điểm:

- role bị phình to nhanh
- khó biểu diễn các quyền tinh vi

### 6.2 Claim-based Authorization

Ví dụ:

```csharp
[Authorize(Policy = "CanManageUsers")]
public IActionResult ManageUsers() => Ok();
```

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanManageUsers", policy =>
        policy.RequireClaim("permission", "users.manage"));
});
```

Ưu điểm:

- mềm dẻo hơn role
- dễ map với permission

### 6.3 Policy-based Authorization

Đây là cách senior dùng rất nhiều.

Ví dụ:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdultOnly", policy =>
        policy.RequireAssertion(context =>
        {
            var ageClaim = context.User.FindFirst("age")?.Value;
            return int.TryParse(ageClaim, out var age) && age >= 18;
        }));
});
```

Policy giúp gom rule vào 1 chỗ, tránh rải logic khắp controller.

### 6.4 Resource-based Authorization

Dùng khi quyền phụ thuộc vào chính resource:

- user chỉ sửa được bài viết của mình
- moderator sửa được bài trong community của họ

Ví dụ:

```csharp
public class PostOwnerRequirement : IAuthorizationRequirement { }

public class PostOwnerHandler
    : AuthorizationHandler<PostOwnerRequirement, Post>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PostOwnerRequirement requirement,
        Post resource)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == resource.AuthorId.ToString())
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

Sử dụng:

```csharp
var result = await _authorizationService.AuthorizeAsync(User, post, new PostOwnerRequirement());
if (!result.Succeeded)
{
    return Forbid();
}
```

Đây là kiểu rất hợp với domain phức tạp.

## 7. Custom authentication trong ASP.NET Core

Custom auth thường được dùng khi:

- token/header của hệ thống riêng
- API key
- HMAC signature
- webhook verification
- legacy SSO

### 7.1 Cách làm đúng tư duy ASP.NET

Thông thường bạn tạo:

1. Một custom scheme
2. Một class kế thừa `AuthenticationHandler<TOptions>`
3. Trong `HandleAuthenticateAsync()`, bạn parse credential và tạo `ClaimsPrincipal`

### 7.2 Ví dụ custom API Key authentication

```csharp
public class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public string HeaderName { get; set; } = "X-Api-Key";
}

public class ApiKeyAuthenticationHandler
    : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Options.HeaderName, out var apiKeyValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var apiKey = apiKeyValues.ToString();
        if (apiKey != "expected-secret")
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid API key"));
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "system-client"),
            new Claim(ClaimTypes.Name, "Internal Service"),
            new Claim("permission", "internal.read")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

Đăng ký:

```csharp
builder.Services
    .AddAuthentication("ApiKey")
    .AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
        "ApiKey",
        options => { });
```

### 7.3 Khi nào nên viết custom handler thay vì custom middleware?

Dùng custom `AuthenticationHandler` khi:

- bạn đang giải bài toán xác thực
- bạn cần tạo `HttpContext.User`
- bạn muốn dùng cùng `[Authorize]`, policy, challenge, forbid

Dùng custom middleware khi:

- bạn chỉ cần pre-processing
- logging
- enrich request context
- validation không phải authentication

Rất nhiều người mới học hay viết auth trong middleware thủ công. Senior thường đẩy nó vào `AuthenticationHandler` để đi đúng pipeline chuẩn của framework.

## 8. Luồng thực tế cho JWT Bearer trong API

Đây là flow phổ biến nhất cho backend:

1. User login với username/password
2. Server validate password
3. Server tạo JWT chứa claims cần thiết
4. Client lưu token
5. Client gửi token trong header `Authorization`
6. `JwtBearerHandler` validate token
7. `HttpContext.User` được tạo
8. `[Authorize]` / policy duyệt quyền
9. Endpoint xử lý request

### Claims nên có

Thường sẽ có:

- `sub` hoặc `ClaimTypes.NameIdentifier`: user id
- `name`
- `email`
- `role`
- `permission`

Không nên nhét quá nhiều thông tin business vào token vì:

- token to
- khó rotate
- stale data

## 9. Cách senior thiết kế phân quyền

### 9.1 Dùng role cho cấp cao, dùng permission cho thao tác cụ thể

Ví dụ:

- Role: `Admin`, `Moderator`, `Member`
- Permission: `posts.create`, `posts.delete`, `community.ban_member`

Role dùng để nhóm quyền.
Permission dùng để check truy cập thực tế.

### 9.2 Không hard-code role lung tung trong controller

Không nên:

```csharp
[Authorize(Roles = "Admin,SuperAdmin,ContentManager")]
```

Nên:

- define policy
- hoặc define permission requirement

Ví dụ:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Posts.Delete", policy =>
        policy.RequireClaim("permission", "posts.delete"));
});
```

Sau đó:

```csharp
[Authorize(Policy = "Posts.Delete")]
```

Nhìn sạch hơn, dễ refactor hơn.

### 9.3 Tách "identity claims" và "domain authorization"

Senior thường tách:

- Authentication layer chỉ xác định user là ai, có claim cơ bản nào
- Authorization layer mới map claim vào rule domain

Ví dụ:

- token có `sub`, `role`
- service authorization mới quyết định user này có được sửa bài của community X không

### 9.4 Resource-based authorization cho domain thực

Cho các bài toán như:

- chỉ owner được sửa profile
- moderator của community mới được approve post
- admin hệ thống được khóa tài khoản

Thì resource-based authorization phù hợp hơn role-based thuần.

## 10. Best practices mà senior hay dùng

### 10.1 Luôn phân biệt rõ authentication và authorization

Dùng trộn 2 lớp này sẽ dẫn tới:

- auth handler chứa business rule
- controller check tay từng điều kiện
- khó test

### 10.2 Đặt middleware đúng thứ tự

Thứ tự kinh điển:

```csharp
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

Nếu có CORS:

```csharp
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

### 10.3 Dùng policy thay vì if-else trong controller

Không nên:

```csharp
if (User.FindFirst("role")?.Value != "Admin") return Forbid();
```

Nên đưa logic vào:

- policy
- authorization handler
- requirement

### 10.4 Không tin role/claim nếu không có nguồn phát hành đáng tin

Với JWT:

- validate signing key
- validate issuer
- validate audience
- validate expiry

Không tắt các check cho "dễ chạy tạm".

### 10.5 Dùng claim type ổn định

Hãy thống nhất:

- user id claim là gì?
- role claim là gì?
- permission claim là gì?

Nếu không, code sẽ loãng và debug rất mệt.

Thường senior sẽ chuẩn hóa:

- `ClaimTypes.NameIdentifier` hoặc `sub` cho user id
- `ClaimTypes.Role` hoặc `role`
- `permission` cho permission

### 10.6 Hạn chế những gì đưa vào token

Token chỉ nên chứa dữ liệu:

- nhỏ
- ổn định
- cần cho authorization

Không nên đưa:

- profile lớn
- state thay đổi liên tục
- danh sách permission quá dài nếu hệ thống phức tạp

Nếu permission quá nhiều, có thể:

- chỉ đưa role/group
- tra thêm quyền từ DB/cache khi cần

### 10.7 Nhớ `Challenge` và `Forbid`

Ý nghĩa:

- `401 Unauthorized`: chưa được xác thực, cần login/token
- `403 Forbidden`: đã xác thực nhưng không đủ quyền

Framework sẽ làm điều này đẹp hơn nếu bạn đi đúng auth handler + authorization pipeline.

### 10.8 Log lý do thất bại, nhưng không lộ thông tin nhạy cảm

Nên log:

- token hết hạn
- issuer sai
- claim thiếu
- policy fail

Không nên log:

- raw password
- full access token
- api key đầy đủ

### 10.9 Test auth và authz ở nhiều tầng

Nên có:

- unit test cho authorization handler
- integration test cho endpoint `[Authorize]`
- test 401 / 403 / 200

### 10.10 Default-deny mindset

Senior thường thiết kế theo hướng:

- endpoint nào cần public thì mới `[AllowAnonymous]`
- còn lại mặc định cần authorize

Với API nội bộ hoặc app nhạy cảm, đây là mindset tốt.

## 11. Mẫu cấu hình JWT + Authorization để học

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Posts.Delete", policy =>
        policy.RequireClaim("permission", "posts.delete"));
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

Controller:

```csharp
[ApiController]
[Route("api/posts")]
public class PostController : ControllerBase
{
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok();

    [Authorize(Policy = "Posts.Delete")]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id) => Ok();

    [AllowAnonymous]
    [HttpPost("login")]
    public IActionResult Login() => Ok();
}
```

## 12. Áp dụng vào project hiện tại của bạn

Trong file [Program.cs](/c:/Users/Admin/OneDrive/Desktop/SocialTech/SocialBackEnd/Program.cs:1), hiện tại app đang:

- có `app.UseAuthorization()`
- chưa thấy `builder.Services.AddAuthentication(...)`
- chưa thấy `app.UseAuthentication()`

Điều này có nghĩa là:

- nếu bạn muốn đọc `User.Claims` một cách đúng chuẩn, bạn cần bổ sung authentication scheme
- nếu một endpoint cần login, hiện tại pipeline chưa đầy đủ

Khung tối thiểu bạn cần thêm:

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(...);

builder.Services.AddAuthorization();
```

Và trong pipeline:

```csharp
app.UseAuthentication();
app.UseAuthorization();
```

Nếu bạn đang làm social backend API, lựa chọn hợp lý nhất thường là:

- JWT Bearer cho mobile/web client
- policy-based authorization cho permission
- resource-based authorization cho rule như owner/moderator/admin

## 13. Khi nào nên chọn mô hình nào?

### Chọn Cookie

Khi:

- app server-rendered
- login session truyền thống

### Chọn JWT Bearer

Khi:

- REST API
- mobile
- SPA
- microservices

### Chọn ASP.NET Core Identity

Khi:

- cần full bộ user management nhanh
- cần reset password, confirm email, 2FA, lockout

### Chọn custom authentication

Khi:

- giao tiếp hệ thống nội bộ
- webhook
- legacy integration
- auth không theo standards có sẵn

## 14. Một số lỗi người mới hay gặp

### Quên `UseAuthentication()`

Đây là lỗi rất phổ biến.

### Trộn role và permission

Ví dụ:

- role lúc thì là "Admin"
- lúc thì "posts.delete"

Cần tách rõ.

### Nhét business rule vào controller

Controller nên mỏng, logic quyền nên vào policy/handler/service.

### Tin dữ liệu token quá mức

Token có thể stale. Không phải mọi claim đều nên là source of truth cuối cùng.

### Check quyền bằng string hard-code khắp nơi

Sau vài tháng sẽ rất khó bảo trì.

## 15. Cách học và implement theo lộ trình dễ nhớ nhất

Nếu bạn muốn học theo đúng trình tự, mình khuyên:

1. Học `ClaimsPrincipal`, `Claim`, `HttpContext.User`
2. Học `AddAuthentication`, `AddJwtBearer`, `UseAuthentication`
3. Học `[Authorize]`, role, policy
4. Học `IAuthorizationRequirement` + `AuthorizationHandler`
5. Học resource-based authorization
6. Sau cùng mới viết custom authentication handler

## 16. Kết luận ngắn gọn

Nếu tóm tắt bằng 1 câu:

- Authentication trong ASP.NET Core là cơ chế xây dựng `HttpContext.User` thông qua `scheme + handler`
- Authorization là cơ chế ra quyết định truy cập thông qua role, claim, policy và resource
- So với Spring Boot, tư duy gần nhất là `filter chain` ~ `middleware pipeline`, nhưng ASP.NET nhấn mạnh hơn vào `authentication schemes`, `handlers` và `authorization policies`

Nếu bạn đang xây social backend:

- bắt đầu bằng JWT Bearer
- dùng policy cho permission
- dùng resource-based authorization cho owner/moderator/admin
- tránh hard-code role khắp nơi

---

Nếu bạn muốn, bước tiếp theo hợp lý nhất là viết thêm cho project này:

1. bộ khung JWT auth thực tế trong `Program.cs`
2. một `CurrentUser` helper để đọc user id/role/claims sạch hơn
3. một permission system có policy và custom requirement cho domain social
