#Task đang bị thiếu xử lý ném lỗi đúng
# Thảo luận về authentication

## Thông tin tài liệu

- Phiên bản: `v1.4`
- Thời điểm câu hỏi gần nhất: `2026-04-22 11:33` (Asia/Bangkok)
- Cập nhật gần nhất: `2026-04-22 11:33` (Asia/Bangkok)
- Quy ước cập nhật:
  - Mỗi lần bổ sung nội dung trong file này, cần cập nhật lại `Phiên bản`
  - Mỗi lần bổ sung nội dung trong file này, cần cập nhật lại `Thời điểm câu hỏi gần nhất`
  - Mỗi lần bổ sung nội dung trong file này, cần cập nhật lại `Cập nhật gần nhất`

Tài liệu này được tạo để chúng ta có thể tiếp tục trao đổi và bổ sung ý kiến trong quá trình thiết kế hệ thống.

Liên quan:
- `docs/architecture/aspnet-authentication-authorization-guide.md`

## Question 1: Trong authentication thì cái nào bảo mật nhất?

### Câu trả lời ngắn

Không có 1 cơ chế nào luôn luôn là "bảo mật nhất" cho mọi trường hợp. Cơ chế phù hợp nhất phụ thuộc vào loại ứng dụng:

- Nếu là web app cùng domain hoặc có thể dùng `BFF` thì cookie session hoặc refresh token trong `HttpOnly Secure SameSite cookie` là hướng rất tốt
- Nếu là SPA/mobile/API phân tán thì thường vẫn dùng access token, nhưng phải lưu trữ đúng cách
- Nếu là hệ thống nội bộ hoặc service-to-service cần mức bảo mật cao hơn nữa thì có thể dùng `mTLS`, `client credentials`, certificate, hoặc token introspection

### Ý bạn đang nghĩ đến là hợp lý, nhưng cần tách rõ 2 thứ

Bạn đang nghĩ:

- Tạo `refresh_token`
- Truyền nó qua cookie
- FE tự động gửi cookie lên
- Auth service validate

Hướng này có thể rất an toàn, nhưng thường chưa đầy đủ nếu chỉ có mỗi refresh token.

Mô hình được dùng nhiều hơn là:

- `access_token` sống ngắn
- `refresh_token` sống dài hơn
- `refresh_token` được đặt trong `HttpOnly Secure SameSite cookie`
- `access_token` chỉ giữ trong bộ nhớ phía client, hoặc không để FE giữ nếu dùng mô hình `BFF`

### Đánh giá nhận định về JWT Bearer

Nhận định "JWT Bearer kém an toàn hơn" là đúng trong một số cách triển khai, nhưng không đúng trong mọi trường hợp.

Vấn đề không nằm ở JWT tự thân, mà nằm ở:

- Token được lưu ở đâu
- Có bị đọc bởi JavaScript hay không
- Thời gian sống có quá dài không
- Có rotation, revoke, device binding, audit log hay không

#### Trường hợp nguy hiểm

Nếu FE lưu `access_token` trong:

- `localStorage`
- `sessionStorage`
- Biến global để script khác có thể đọc được

thì khi có `XSS`, token có thể bị lấy cắp. Lúc đó kẻ tấn công có thể gọi API thay mặt user cho đến khi token hết hạn.

Đây là nỗi lo của bạn, và lo ngại này hoàn toàn hợp lý.

#### Trường hợp an toàn hơn

JWT Bearer vẫn có thể được dùng an toàn hơn nếu:

- `access_token` sống rất ngắn, ví dụ 5-15 phút
- Không lưu `access_token` trong `localStorage`
- `refresh_token` nằm trong `HttpOnly Secure SameSite cookie`
- Có `refresh token rotation`
- Có cơ chế revoke khi logout, đổi mật khẩu, nghi ngờ bị chiếm quyền
- API validate đầy đủ `issuer`, `audience`, `signature`, `expiry`

### Cookie có phải lúc nào cũng tốt hơn JWT không?

Không. Cookie cũng có rủi ro riêng:

- Dễ bị `CSRF` nếu cấu hình không đúng
- Khó hơn khi FE và BE tách domain phức tạp
- Khó dùng hơn cho mobile app và public API

Nếu dùng cookie, cần đi kèm:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` hoặc `SameSite=Strict` nếu phù hợp
- `CSRF protection` cho các request thay đổi dữ liệu

### Khuyến nghị thực tế

#### Trường hợp 1: Web app nội bộ, FE + BE cùng hệ sinh thái

Hướng mình ưu tiên:

- Đăng nhập thành công
- Server cấp session cookie hoặc cấp `refresh_token` trong `HttpOnly Secure SameSite cookie`
- Nếu cần token cho API thì cấp `access_token` sống ngắn
- Không lưu token nhạy cảm trong `localStorage`

Đây là hướng cân bằng tốt giữa:

- Bảo mật
- Trải nghiệm người dùng
- Khả năng revoke
- Dễ vận hành

#### Trường hợp 2: SPA tách riêng frontend và backend

Hướng phổ biến:

- `access_token` sống ngắn
- `refresh_token` trong `HttpOnly Secure cookie`
- Refresh rotation
- `CORS` + `CSRF` + cookie policy cấu hình rất kỹ

Nếu muốn bảo mật hơn nữa cho web, có thể xem mô hình `BFF`:

- Browser chỉ nói chuyện với BFF bằng cookie
- BFF gọi API/backend phía sau
- Browser không cầm token trực tiếp

Mô hình này thường an toàn hơn việc để SPA giữ bearer token.

### Kết luận cho Question 1

Nếu nói theo ý "an toàn nhất cho web app", thì thường:

- Không để access token lộ ra FE
- Dùng `HttpOnly Secure SameSite cookie`
- Nếu có refresh token thì phải rotation và revoke được
- Bổ sung `CSRF protection`

Vì vậy, ý tưởng của bạn là đi đúng hướng, nhưng nên sửa thành:

- Không chỉ "lưu refresh token trong cookie là đủ"
- Mà là "thiết kế đầy đủ quanh cookie + access token ngắn hạn + rotation + CSRF + revoke"

## Question 2: Giải thích các cơ chế authentication khác

### 1. Cookie Authentication / Session Authentication

Cơ chế:

- User login
- Server tạo session hoặc auth ticket
- Trình duyệt giữ cookie
- Mỗi request tiếp theo tự động gửi cookie
- Server đọc cookie để xác định user

Ưu điểm:

- Hợp với web app truyền thống
- Dễ revoke hơn token tự quản lý
- Không cần để token lộ ra JavaScript nếu dùng `HttpOnly`

Nhược điểm:

- Cần xử lý `CSRF`
- Ít phù hợp hơn cho mobile/public API

Dùng tốt khi:

- MVC, Razor Pages, BFF, admin portal, hệ thống nội bộ

### 2. JWT Bearer Authentication

Cơ chế:

- User login và nhận `access_token`
- Client gửi `Authorization: Bearer <token>`
- API tự validate token

Ưu điểm:

- Hợp với REST API, mobile, microservice
- Stateless ở phía resource server
- Dễ tích hợp với identity provider

Nhược điểm:

- Nếu lưu sai chỗ lưu trữ client thì dễ bị lộ token
- Khó revoke ngay lập tức hơn session thông thường
- Dễ bị làm quá hạn bảo mật nếu token sống quá dài

Dùng tốt khi:

- API cho SPA/mobile/service

### 3. Opaque Token + Introspection

Cơ chế:

- Client nhận token không chứa dữ liệu mà chỉ là một mã định danh
- Resource server hỏi auth server xem token còn hợp lệ hay không

Ưu điểm:

- Revoke nhanh
- Kiểm soát tập trung
- Giảm lộ thông tin claim trên client

Nhược điểm:

- Mỗi request có thể cần gọi auth server hoặc cache
- Tăng độ phức tạp và độ trễ

Dùng tốt khi:

- Cần kiểm soát tập trung, cần revoke mạnh

### 4. OAuth 2.0

Đây là cơ chế ủy quyền, không phải chỉ riêng authentication.

Nó trả lời câu hỏi:

- Ứng dụng này có được phép thay mặt user truy cập tài nguyên không?

Các flow phổ biến:

- Authorization Code + PKCE
- Client Credentials
- Device Code

Dùng tốt khi:

- Đăng nhập qua bên thứ ba
- Tích hợp Google, Microsoft, GitHub
- Cấp quyền cho app gọi API

### 5. OpenID Connect (OIDC)

OIDC là lớp xác thực xây trên OAuth 2.0.

Nó bổ sung:

- `id_token`
- Thông tin danh tính user
- Login/SSO/logout federation

Dùng tốt khi:

- Bạn cần "đăng nhập với Google/Microsoft/Keycloak/Auth0"
- Bạn cần SSO

### 6. API Key

Cơ chế:

- Client gửi một key cố định trong header hoặc query

Ưu điểm:

- Đơn giản
- Dễ dùng cho internal integration nhỏ

Nhược điểm:

- Không biểu diễn user tốt
- Khó phân quyền chi tiết
- Nếu lộ key thì rất nguy hiểm

Dùng tốt khi:

- Service đơn giản, webhook, internal tool nhỏ

Không nên dùng cho:

- Hệ thống user-facing cần đăng nhập/phân quyền đầy đủ

### 7. Basic Authentication

Cơ chế:

- Gửi username/password theo header `Authorization: Basic ...`
- Thường phải đi kèm HTTPS

Ưu điểm:

- Rất đơn giản

Nhược điểm:

- Yếu về bảo mật và trải nghiệm
- Password được gửi lặp lại trên mỗi request

Chỉ nên dùng khi:

- Hệ thống cũ, script nội bộ, hoặc bài toán rất hạn chế

### 8. Windows / Negotiate / Kerberos

Cơ chế:

- Đăng nhập dựa trên tài khoản domain Windows

Ưu điểm:

- Tốt cho intranet doanh nghiệp
- SSO trong môi trường AD

Nhược điểm:

- Phụ thuộc hạ tầng enterprise
- Không hợp với public internet app thông thường

### 9. Certificate Authentication / Mutual TLS

Cơ chế:

- Client cũng xuất trình certificate khi kết nối

Ưu điểm:

- Rất mạnh cho xác thực máy-với-máy
- Giảm phụ thuộc vào secret thông thường

Nhược điểm:

- Vận hành certificate phức tạp
- Khó triển khai cho end-user browser thông thường

Dùng tốt khi:

- Service-to-service mức bảo mật cao

## Question 3: Code minh họa cho từng cơ chế auth

### Quy ước cho phần ví dụ

- FE minh họa bằng `Next.js`
- BE minh họa bằng `ASP.NET Core`
- Code ở đây là ví dụ thực tế tối giản để dễ hiểu, không phải bản production hoàn chỉnh
- Với các cơ chế nội bộ như `Negotiate` hoặc `mTLS`, FE `Next.js` thường không phải nơi xử lý chính

### 1. Cookie Authentication / Session Authentication

Khi nên dùng:

- Web app nội bộ
- Admin portal
- Hệ thống SSR hoặc BFF

#### ASP.NET Core

```csharp
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "socialtech.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.LoginPath = "/auth/login";
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/auth/login", async (HttpContext http, LoginRequest request) =>
{
    if (request.Email != "admin@local" || request.Password != "123456")
    {
        return Results.Unauthorized();
    }

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, "u_1"),
        new Claim(ClaimTypes.Email, request.Email),
        new Claim(ClaimTypes.Role, "Admin")
    };

    var identity = new ClaimsIdentity(
        claims,
        CookieAuthenticationDefaults.AuthenticationScheme);

    await http.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(identity));

    return Results.Ok(new { message = "Đăng nhập thành công" });
});

app.MapGet("/me", (ClaimsPrincipal user) =>
{
    return Results.Ok(new
    {
        userId = user.FindFirstValue(ClaimTypes.NameIdentifier),
        email = user.FindFirstValue(ClaimTypes.Email),
        role = user.FindFirstValue(ClaimTypes.Role)
    });
}).RequireAuthorization();

app.Run();

record LoginRequest(string Email, string Password);
```

#### Next.js

```ts
// app/login/actions.ts
"use server";

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  await fetch("https://api.local/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
}
```

```tsx
// app/profile/page.tsx
export default async function ProfilePage() {
  const response = await fetch("https://api.local/me", {
    credentials: "include",
    cache: "no-store",
  });

  const profile = await response.json();

  return <pre>{JSON.stringify(profile, null, 2)}</pre>;
}
```

Điểm cần nhớ:

- Browser tự gửi cookie
- FE không phải giữ token
- Cần chống `CSRF` cho request cập nhật dữ liệu

### 2. JWT Bearer Authentication

Khi nên dùng:

- SPA gọi API
- Mobile app
- Microservice

#### ASP.NET Core

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var key = "super-secret-key-super-secret-key";

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
            ValidIssuer = "SocialTech",
            ValidAudience = "SocialTech.Web",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/auth/token", (LoginRequest request) =>
{
    if (request.Email != "admin@local" || request.Password != "123456")
    {
        return Results.Unauthorized();
    }

    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, "u_1"),
        new Claim(JwtRegisteredClaimNames.Email, request.Email),
        new Claim(ClaimTypes.Role, "Admin")
    };

    var credentials = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: "SocialTech",
        audience: "SocialTech.Web",
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(10),
        signingCredentials: credentials);

    return Results.Ok(new
    {
        accessToken = new JwtSecurityTokenHandler().WriteToken(token)
    });
});

app.MapGet("/posts", (ClaimsPrincipal user) =>
{
    return Results.Ok(new
    {
        owner = user.FindFirstValue(JwtRegisteredClaimNames.Email),
        items = new[] { "post-1", "post-2" }
    });
}).RequireAuthorization();

app.Run();

record LoginRequest(string Email, string Password);
```

#### Next.js

```tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [accessToken, setAccessToken] = useState("");

  async function handleLogin() {
    const response = await fetch("https://api.local/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@local",
        password: "123456",
      }),
    });

    const data = await response.json();
    setAccessToken(data.accessToken);
  }

  async function loadPosts() {
    const response = await fetch("https://api.local/posts", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(await response.json());
  }

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={loadPosts}>Load posts</button>
    </div>
  );
}
```

Điểm cần nhớ:

- Ví dụ này giữ token trong state để đơn giản hóa
- Trong production, tránh `localStorage` nếu có thể
- Nếu là web app, nên kết hợp với refresh token trong cookie hoặc dùng `BFF`

### 3. JWT ngắn hạn + Refresh Token trong cookie

Khi nên dùng:

- FE là SPA
- Muốn cân bằng giữa UX và bảo mật

#### ASP.NET Core

```csharp
app.MapPost("/auth/login", (HttpContext http, LoginRequest request) =>
{
    if (request.Email != "admin@local" || request.Password != "123456")
    {
        return Results.Unauthorized();
    }

    var accessToken = "short-lived-access-token";
    var refreshToken = Guid.NewGuid().ToString("N");

    // Thực tế cần hash refresh token trước khi lưu DB
    RefreshTokenStore.Save(userId: "u_1", refreshToken);

    http.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Expires = DateTimeOffset.UtcNow.AddDays(7)
    });

    return Results.Ok(new { accessToken });
});

app.MapPost("/auth/refresh", (HttpContext http) =>
{
    var refreshToken = http.Request.Cookies["refresh_token"];
    if (string.IsNullOrWhiteSpace(refreshToken) || !RefreshTokenStore.IsValid(refreshToken))
    {
        return Results.Unauthorized();
    }

    var newAccessToken = "new-short-lived-access-token";
    var newRefreshToken = Guid.NewGuid().ToString("N");

    RefreshTokenStore.Rotate(oldToken: refreshToken, newToken: newRefreshToken);

    http.Response.Cookies.Append("refresh_token", newRefreshToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Expires = DateTimeOffset.UtcNow.AddDays(7)
    });

    return Results.Ok(new { accessToken = newAccessToken });
});

static class RefreshTokenStore
{
    private static readonly HashSet<string> Tokens = new();

    public static void Save(string userId, string refreshToken) => Tokens.Add(refreshToken);
    public static bool IsValid(string refreshToken) => Tokens.Contains(refreshToken);

    public static void Rotate(string oldToken, string newToken)
    {
        Tokens.Remove(oldToken);
        Tokens.Add(newToken);
    }
}
```

#### Next.js

```ts
let accessToken = "";

export async function login() {
  const response = await fetch("https://api.local/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@local",
      password: "123456",
    }),
    credentials: "include",
  });

  const data = await response.json();
  accessToken = data.accessToken;
}

export async function apiFetch(url: string) {
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });

  if (response.status === 401) {
    const refresh = await fetch("https://api.local/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refresh.ok) {
      throw new Error("Phiên đăng nhập đã hết hạn");
    }

    const refreshed = await refresh.json();
    accessToken = refreshed.accessToken;

    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });
  }

  return response;
}
```

Điểm cần nhớ:

- Đây là một trong các hướng hợp lý nhất cho web app hiện đại
- Refresh token phải có rotation
- Khi logout hoặc nghi ngờ xâm nhập, cần revoke token phía server

### 4. Opaque Token + Introspection

Khi nên dùng:

- Auth server riêng
- Muốn resource server luôn kiểm tra tính hợp lệ tức thời

#### ASP.NET Core resource server

```csharp
builder.Services.AddHttpClient();
builder.Services.AddAuthentication("Opaque")
    .AddScheme<AuthenticationSchemeOptions, OpaqueTokenHandler>("Opaque", _ => { });

builder.Services.AddAuthorization();

public sealed class OpaqueTokenHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IHttpClientFactory _httpClientFactory;

    public OpaqueTokenHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IHttpClientFactory httpClientFactory)
        : base(options, logger, encoder)
    {
        _httpClientFactory = httpClientFactory;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer "))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authHeader["Bearer ".Length..];
        var client = _httpClientFactory.CreateClient();

        var response = await client.PostAsJsonAsync("https://auth.local/introspect", new { token });
        if (!response.IsSuccessStatusCode)
        {
            return AuthenticateResult.Fail("Token không hợp lệ");
        }

        var payload = await response.Content.ReadFromJsonAsync<IntrospectionResult>();
        if (payload is null || !payload.Active)
        {
            return AuthenticateResult.Fail("Token hết hạn hoặc đã revoke");
        }

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, payload.Sub) };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);

        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
    }
}

public record IntrospectionResult(bool Active, string Sub);
```

#### Next.js

```ts
export async function loadFeed(token: string) {
  return fetch("https://api.local/feed", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

Điểm cần nhớ:

- FE gần như không khác JWT Bearer
- Điểm khác nằm ở server: token không tự giải mã được, phải hỏi auth server

### 5. OAuth 2.0 / OpenID Connect đăng nhập qua nhà cung cấp ngoài

Khi nên dùng:

- Login bằng Google/Microsoft
- SSO doanh nghiệp

#### Next.js với Auth.js

```ts
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});
```

```tsx
// app/login/page.tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button type="submit">Đăng nhập với Google</button>
    </form>
  );
}
```

#### ASP.NET Core API validate access token từ OIDC provider

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "socialtech-api";
        options.RequireHttpsMetadata = true;
    });

builder.Services.AddAuthorization();
```

Điểm cần nhớ:

- FE không nên tự làm flow OAuth thủ công nếu không cần
- Thực tế nên dùng provider chuẩn như `Auth.js`, `NextAuth`, hoặc BFF

### 6. API Key Authentication

Khi nên dùng:

- Internal integration
- Webhook đơn giản

#### ASP.NET Core

```csharp
app.MapGet("/internal/rebuild-cache", (HttpRequest request) =>
{
    var apiKey = request.Headers["X-Api-Key"].ToString();
    if (apiKey != builder.Configuration["InternalApiKey"])
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new { message = "Cache rebuilt" });
});
```

#### Next.js

```ts
export async function rebuildCache() {
  return fetch("https://api.local/internal/rebuild-cache", {
    headers: {
      "X-Api-Key": process.env.INTERNAL_API_KEY!,
    },
    method: "GET",
  });
}
```

Điểm cần nhớ:

- Không dùng cho user login thông thường
- Nên scope key theo hệ thống gọi

### 7. Basic Authentication

Khi nên dùng:

- Script nội bộ
- Tool tạm thời

#### ASP.NET Core

```csharp
app.MapGet("/legacy/report", (HttpRequest request) =>
{
    var header = request.Headers.Authorization.ToString();
    if (!header.StartsWith("Basic "))
    {
        return Results.Unauthorized();
    }

    var encoded = header["Basic ".Length..];
    var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
    var parts = decoded.Split(':', 2);

    if (parts.Length != 2 || parts[0] != "report-user" || parts[1] != "report-pass")
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new { report = "ok" });
});
```

#### Next.js

```ts
export async function loadLegacyReport() {
  const basic = Buffer.from("report-user:report-pass").toString("base64");

  return fetch("https://api.local/legacy/report", {
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });
}
```

Điểm cần nhớ:

- Chỉ dùng qua `HTTPS`
- Không phù hợp cho sản phẩm chính có người dùng thật

### 8. Windows / Negotiate / Kerberos

Khi nên dùng:

- Intranet doanh nghiệp
- Máy người dùng join domain

#### ASP.NET Core

```csharp
builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
    .AddNegotiate();

builder.Services.AddAuthorization();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/intranet/me", (ClaimsPrincipal user) =>
{
    return Results.Ok(new
    {
        name = user.Identity?.Name
    });
}).RequireAuthorization();
```

#### Next.js

```ts
export async function loadIntranetProfile() {
  return fetch("https://intranet-api.local/intranet/me", {
    credentials: "include",
  });
}
```

Điểm cần nhớ:

- Phần auth thật sự được xử lý bởi trình duyệt + Windows + server
- `Next.js` chỉ đóng vai trò gọi API nội bộ

### 9. Certificate Authentication / Mutual TLS

Khi nên dùng:

- Service-to-service bảo mật cao
- Gateway nội bộ

#### ASP.NET Core

```csharp
builder.Services
    .AddAuthentication(CertificateAuthenticationDefaults.AuthenticationScheme)
    .AddCertificate(options =>
    {
        options.AllowedCertificateTypes = CertificateTypes.All;
        options.Events = new CertificateAuthenticationEvents
        {
            OnCertificateValidated = context =>
            {
                var claims = new[]
                {
                    new Claim(ClaimTypes.Name, context.ClientCertificate.Subject)
                };

                context.Principal = new ClaimsPrincipal(
                    new ClaimsIdentity(claims, context.Scheme.Name));

                context.Success();
                return Task.CompletedTask;
            }
        };
    });
```

#### Next.js

```ts
// Thực tế browser Next.js không phải nơi phù hợp để cầm client certificate.
// mTLS thường dùng giữa gateway, backend service, worker, hoặc reverse proxy.
export async function callSecureServiceThroughGateway() {
  return fetch("https://web-gateway.local/secure-data");
}
```

Điểm cần nhớ:

- Với web app, certificate thường terminate ở gateway hoặc reverse proxy
- Phù hợp cho server-to-server hơn là browser-to-server

## Question 4: Hướng dẫn làm JWT Auth qua middleware trong ASP.NET Core

### Mục tiêu của phần này

Phần này tập trung vào cách nghĩ JWT Auth trong hệ sinh thái `ASP.NET Core` theo kiểu gần giống `Spring Security`, tức là nhìn auth như một luồng xử lý request trong pipeline chứ không chỉ là vài đoạn code login.

### Cách map tư duy từ Spring Security sang ASP.NET Core

Nếu bạn quen `Java Spring Security`, có thể map nhanh như sau:

- `SecurityFilterChain` gần tương đương `Middleware Pipeline`
- `OncePerRequestFilter` gần tương đương custom middleware hoặc custom auth handler
- `BearerTokenAuthenticationFilter` gần tương đương `JwtBearerHandler`
- `SecurityContextHolder.getContext().getAuthentication()` gần tương đương `HttpContext.User`
- `AuthenticationManager` gần tương đương `IAuthenticationService`
- `UserDetailsService` gần tương đương user service hoặc application service dùng để nạp claims/user profile
- `@PreAuthorize` gần tương đương `[Authorize]`, policy, role, claim requirements

Điểm khác rất quan trọng là:

- Trong `ASP.NET Core`, phần validate credential thường được đóng gói trong `AuthenticationHandler`
- Middleware `UseAuthentication()` sẽ gọi handler của scheme hiện tại
- Nếu handler xác thực thành công, nó gán `ClaimsPrincipal` vào `HttpContext.User`
- Middleware `UseAuthorization()` dùng `HttpContext.User` để kiểm tra quyền

### Sơ đồ luồng hệ sinh thái JWT Auth trong ASP.NET Core

```text
Next.js / Mobile / Client
  -> POST /auth/login
     -> AuthController / AuthEndpoint
     -> UserService kiểm tra email/password
     -> TokenService tạo JWT access token
     -> trả access_token cho client

Client gọi API tiếp theo
  -> GET /api/posts
  -> Header: Authorization: Bearer <jwt>

ASP.NET Core Pipeline
  -> UseRouting()
  -> Custom middleware logging/correlation (nếu có)
  -> UseAuthentication()
     -> AuthenticationService
     -> JwtBearerHandler
        -> đọc Authorization header
        -> tách Bearer token
        -> validate signature
        -> validate issuer
        -> validate audience
        -> validate expiry
        -> map claims trong token thành ClaimsPrincipal
        -> gán vào HttpContext.User
  -> UseAuthorization()
     -> đọc metadata của endpoint
     -> kiểm tra [Authorize], role, policy, claim
  -> Endpoint/Controller
     -> Application service
     -> Repository/DB
```

### Sơ đồ so sánh với Spring Security

```text
Spring Security
  Request
    -> SecurityFilterChain
    -> BearerTokenAuthenticationFilter
    -> AuthenticationManager
    -> SecurityContextHolder
    -> AuthorizationFilter
    -> Controller

ASP.NET Core
  Request
    -> Middleware Pipeline
    -> UseAuthentication()
    -> JwtBearerHandler
    -> HttpContext.User
    -> UseAuthorization()
    -> Controller / Minimal API
```

### Các thành phần thường có trong một hệ JWT Auth thực tế

Trong dự án thật, bạn thường sẽ có các lớp sau:

- `AuthController` hoặc `/auth/login` endpoint
- `ITokenService` để tạo access token
- `IUserAuthenticationService` để kiểm tra tài khoản/mật khẩu
- `Program.cs` để đăng ký `AddAuthentication().AddJwtBearer(...)`
- `[Authorize]` trên controller/action/endpoint
- Có thể thêm `IClaimsTransformation` nếu muốn enrich claims sau khi token đã validate

### Cấu trúc đề xuất trong ASP.NET Core

```text
SocialBackEnd
  /Api
    /Controllers
      AuthController.cs
      UsersController.cs
  /Application
    /Security
      ITokenService.cs
      IUserAuthenticationService.cs
  /Infrastructure
    /Security
      JwtTokenService.cs
      UserAuthenticationService.cs
```

### Bước 1: Cấu hình JWT trong `appsettings.json`

```json
{
  "Jwt": {
    "Issuer": "SocialTech",
    "Audience": "SocialTech.Web",
    "SecretKey": "super-secret-key-super-secret-key",
    "AccessTokenMinutes": 15
  }
}
```

Ý nghĩa:

- `Issuer`: hệ thống phát hành token
- `Audience`: hệ thống được phép dùng token đó
- `SecretKey`: khóa ký HMAC
- `AccessTokenMinutes`: thời gian sống của access token

### Bước 2: Tạo model cấu hình JWT

```csharp
public sealed class JwtOptions
{
    // Tên section trong appsettings để bind sang object này.
    public const string SectionName = "Jwt";

    // Hệ thống phát hành token.
    public string Issuer { get; init; } = string.Empty;

    // Hệ thống/ứng dụng nào được phép sử dụng token này.
    public string Audience { get; init; } = string.Empty;

    // Secret dùng để ký token bằng HMAC.
    public string SecretKey { get; init; } = string.Empty;

    // Thời gian sống của access token, tính theo phút.
    public int AccessTokenMinutes { get; init; } = 15;
}
```

### Bước 3: Tạo `ITokenService`

```csharp
public interface ITokenService
{
    // Nhận thông tin user đã xác thực và phát ra access token JWT.
    string CreateAccessToken(UserIdentity user);
}

// DTO tối giản mô tả identity mà token cần mang theo.
public sealed record UserIdentity(
    string UserId,
    string Email,
    string[] Roles,
    string[] Permissions);
```

### Bước 4: Cài đặt `JwtTokenService`

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

public sealed class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        // Lấy cấu hình JWT đã bind từ appsettings.
        _options = options.Value;
    }

    public string CreateAccessToken(UserIdentity user)
    {
        // Tạo danh sách claim "nền" mà hầu hết endpoint sẽ cần.
        // Sub là chuẩn JWT, còn NameIdentifier/Email tiện cho ASP.NET đọc sau này.
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.UserId),
            new(ClaimTypes.Email, user.Email)
        };

        // Map role sang ClaimTypes.Role để [Authorize(Roles = ...)] hoạt động đúng.
        foreach (var role in user.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Map quyền chi tiết sang custom claim "permission"
        // để policy-based authorization có thể dùng lại.
        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        // Chuyển SecretKey thành security key mà thư viện JWT có thể dùng để ký.
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));

        // Chọn thuật toán ký. HMAC SHA256 là lựa chọn phổ biến cho symmetric key.
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Tạo JWT object với đầy đủ issuer, audience, claims, expiry và chữ ký.
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: credentials);

        // Serialize token object thành chuỗi để trả về cho client.
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

### Bước 5: Tạo service xác thực user

```csharp
public interface IUserAuthenticationService
{
    // Nhận thông tin đăng nhập và trả về identity nếu xác thực thành công.
    Task<UserIdentity?> ValidateCredentialsAsync(string email, string password, CancellationToken cancellationToken);
}

public sealed class UserAuthenticationService : IUserAuthenticationService
{
    public Task<UserIdentity?> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        // Demo tối giản: hard-code user.
        // Dự án thật sẽ đọc DB và so khớp password hash.
        if (email != "admin@local" || password != "123456")
        {
            return Task.FromResult<UserIdentity?>(null);
        }

        // Khi validate thành công, trả về identity để tầng token service dùng phát JWT.
        var user = new UserIdentity(
            UserId: "u_1",
            Email: email,
            Roles: ["Admin"],
            Permissions: ["users.read", "users.write"]);

        return Task.FromResult<UserIdentity?>(user);
    }
}
```

Trong dự án thật, service này thường:

- Gọi `UserManager` nếu dùng `ASP.NET Core Identity`
- Hoặc gọi repository/application service để lấy user
- So khớp password hash bằng `PasswordHasher`

### Bước 6: Cấu hình middleware auth trong `Program.cs`

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Bind cấu hình từ appsettings vào JwtOptions để có thể inject bằng IOptions<JwtOptions>.
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));

// Lấy trực tiếp cấu hình JWT để dùng ngay lúc cấu hình middleware.
var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? throw new InvalidOperationException("Missing Jwt configuration");

// Đăng ký service phát token và service xác thực user vào DI container.
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();

builder.Services
    // Đặt scheme mặc định là Bearer để ASP.NET biết request protected sẽ dùng handler nào.
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Với production nên bắt buộc HTTPS để tránh token bị lộ trên đường truyền.
        options.RequireHttpsMetadata = true;

        // Không cần giữ lại token trong AuthenticationProperties của framework.
        options.SaveToken = false;

        // Đây là bộ rule mà JwtBearerHandler sẽ dùng để validate token ở mỗi request.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Token phải do đúng issuer phát hành.
            ValidateIssuer = true,

            // Token phải được cấp cho đúng audience.
            ValidateAudience = true,

            // Token hết hạn thì bị từ chối.
            ValidateLifetime = true,

            // Chữ ký phải đúng với secret/key mà server đang tin tưởng.
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            // Cho phép lệch giờ nhỏ giữa các server/client.
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Các event này giống các hook để mình chèn log hoặc custom logic quanh quá trình auth.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Mặc định JwtBearer đọc Authorization header.
                // Có thể custom lấy token từ cookie/query nếu thật sự cần.
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                // Chỗ này tương tự hook sau khi auth thành công.
                // Có thể log, attach tenant, hoặc kiểm tra thêm trạng thái user.
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                // Chỗ tốt để log nguyên nhân token sai/hết hạn.
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                // Chạy khi endpoint yêu cầu auth nhưng request không hợp lệ.
                return Task.CompletedTask;
            }
        };
    });

// Authorization policy dùng custom claim "permission".
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanWriteUsers", policy =>
        policy.RequireClaim("permission", "users.write"));
});

// Đăng ký MVC/Web API controllers.
builder.Services.AddControllers();

var app = builder.Build();

// Xác định endpoint trước.
app.UseRouting();

// Chạy authentication để set HttpContext.User từ JWT.
app.UseAuthentication();

// Dùng user vừa được set ở trên để kiểm tra role/policy/claim.
app.UseAuthorization();

// Map controller vào pipeline.
app.MapControllers();
app.Run();
```

### Vai trò của từng dòng trong pipeline

- `AddAuthentication(...)`: khai báo scheme auth mặc định
- `AddJwtBearer(...)`: đăng ký handler đọc và validate bearer token
- `UseAuthentication()`: middleware chạy auth và set `HttpContext.User`
- `UseAuthorization()`: middleware đọc user đã xác thực để kiểm tra quyền
- `MapControllers()`: cuối pipeline, controller mới được gọi

Nếu thiếu `UseAuthentication()`:

- Token có thể đúng nhưng `HttpContext.User` vẫn rỗng
- `[Authorize]` sẽ không hoạt động như bạn mong đợi

Nếu `UseAuthorization()` đứng trước `UseAuthentication()`:

- Authorization sẽ chạy khi chưa có user
- Kết quả thường là `401` hoặc `403` sai ngữ cảnh

### Bước 7: Tạo controller login và API được bảo vệ

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    [HttpPost("login")]
    // Endpoint login phải mở cho người chưa đăng nhập.
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        // Body chứa email/password client gửi lên.
        [FromBody] LoginRequest request,

        // Resolve service từ DI để xử lý xác thực user.
        [FromServices] IUserAuthenticationService authService,
        [FromServices] ITokenService tokenService,
        CancellationToken cancellationToken)
    {
        // Bước 1: kiểm tra tài khoản/mật khẩu có hợp lệ không.
        var user = await authService.ValidateCredentialsAsync(
            request.Email,
            request.Password,
            cancellationToken);

        // Không hợp lệ thì trả 401 ngay, chưa phát token.
        if (user is null)
        {
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });
        }

        // Bước 2: phát access token từ identity vừa xác thực.
        var accessToken = tokenService.CreateAccessToken(user);

        // Trả token về cho FE để FE dùng gọi API protected.
        return Ok(new LoginResponse(accessToken, "Bearer", 900));
    }
}

// Request contract cho login.
public sealed record LoginRequest(string Email, string Password);

// Response contract chuẩn hóa dữ liệu token trả về.
public sealed record LoginResponse(string AccessToken, string TokenType, int ExpiresIn);
```

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("users")]
// Mặc định toàn bộ controller này yêu cầu user phải authenticated.
[Authorize]
public sealed class UsersController : ControllerBase
{
    [HttpGet("me")]
    public IActionResult Me()
    {
        // User ở đây được framework gán từ JWT sau khi UseAuthentication() chạy thành công.
        return Ok(new
        {
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            email = User.FindFirstValue(ClaimTypes.Email),
            roles = User.FindAll(ClaimTypes.Role).Select(x => x.Value).ToArray(),
            permissions = User.FindAll("permission").Select(x => x.Value).ToArray()
        });
    }

    [HttpGet]
    // Chỉ user có role Admin mới gọi được endpoint này.
    [Authorize(Roles = "Admin")]
    public IActionResult GetUsers()
    {
        return Ok(new[] { "user-1", "user-2" });
    }

    [HttpPost]
    // Dùng policy khi muốn kiểm tra permission chi tiết hơn role.
    [Authorize(Policy = "CanWriteUsers")]
    public IActionResult CreateUser()
    {
        return Ok(new { created = true });
    }
}
```

### Bước 8: `Next.js` gọi login và gọi API protected

```ts
// app/lib/auth-api.ts
export async function login(email: string, password: string) {
  // Gọi endpoint login để lấy access token.
  const response = await fetch("https://api.local/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // Nếu login lỗi thì ném exception để UI xử lý.
  if (!response.ok) {
    throw new Error("Đăng nhập thất bại");
  }

  // Parse JSON response thành object có cấu trúc rõ ràng.
  return response.json() as Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }>;
}

export async function getMe(accessToken: string) {
  // Gọi API protected và gắn access token vào Authorization header.
  const response = await fetch("https://api.local/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  // Nếu token thiếu/sai/hết hạn thì request sẽ fail ở đây.
  if (!response.ok) {
    throw new Error("Không lấy được thông tin người dùng");
  }

  return response.json();
}
```

```tsx
"use client";

import { useState } from "react";
import { getMe, login } from "@/app/lib/auth-api";

export default function JwtDemoPage() {
  // Demo tối giản: giữ token ngay trong component state.
  const [token, setToken] = useState("");
  const [me, setMe] = useState<unknown>(null);

  async function handleLogin() {
    // Bấm login -> gọi backend -> nhận access token.
    const result = await login("admin@local", "123456");
    setToken(result.accessToken);
  }

  async function handleLoadProfile() {
    // Dùng token vừa có để gọi endpoint protected.
    const profile = await getMe(token);
    setMe(profile);
  }

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLoadProfile} disabled={!token}>
        Load profile
      </button>
      <pre>{JSON.stringify(me, null, 2)}</pre>
    </div>
  );
}
```

### Trình tự request thực tế của JWT middleware

```text
1. Client gọi POST /auth/login với email/password
2. AuthController gọi IUserAuthenticationService
3. Nếu hợp lệ, ITokenService tạo JWT
4. Server trả access_token về cho client
5. Client gọi GET /users/me với Authorization: Bearer <token>
6. UseAuthentication() chạy
7. JwtBearerHandler đọc header Authorization
8. JwtBearerHandler validate token
9. Nếu hợp lệ, tạo ClaimsPrincipal và set HttpContext.User
10. UseAuthorization() kiểm tra [Authorize]
11. UsersController.Me() được phép chạy
12. Response trả về cho client
```

### Cách hiểu `401` và `403` trong flow này

- `401 Unauthorized`: chưa xác thực hoặc token không hợp lệ
- `403 Forbidden`: đã xác thực nhưng không đủ quyền

Ví dụ:

- Token sai chữ ký, hết hạn, sai issuer: thường là `401`
- User có token hợp lệ nhưng không có role `Admin`: thường là `403`

### Khi nào cần custom middleware riêng?

Phần lớn JWT Auth chuẩn không cần tự viết middleware parse token bằng tay. Nên ưu tiên:

- `AddJwtBearer(...)`
- `JwtBearerEvents`
- `IClaimsTransformation`
- `AuthorizationPolicy`

Chỉ nên viết custom middleware khi bạn cần:

- Correlation ID
- Audit log
- Tenant resolution
- Gắn extra context trước/sau auth

Không nên tự parse JWT trong middleware riêng nếu framework đã làm tốt việc đó.

### Ví dụ custom middleware đi kèm JWT

```csharp
public sealed class RequestContextMiddleware
{
    private readonly RequestDelegate _next;

    public RequestContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, ILogger<RequestContextMiddleware> logger)
    {
        var traceId = context.TraceIdentifier;
        logger.LogInformation("Request {TraceId} started for {Path}", traceId, context.Request.Path);

        await _next(context);

        logger.LogInformation("Request {TraceId} finished with {StatusCode}", traceId, context.Response.StatusCode);
    }
}
```

Đăng ký:

```csharp
app.UseRouting();
app.UseMiddleware<RequestContextMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
```

### Sơ đồ đầy đủ gần với Spring Security hơn

```text
Request
  -> UseRouting()
  -> RequestContextMiddleware
  -> UseAuthentication()
     -> AuthenticationService.AuthenticateAsync("Bearer")
     -> JwtBearerHandler.HandleAuthenticateAsync()
        -> Read Authorization header
        -> Validate token
        -> Build ClaimsIdentity
        -> Build ClaimsPrincipal
        -> Set HttpContext.User
  -> UseAuthorization()
     -> AuthorizationMiddleware
     -> Evaluate endpoint metadata
     -> Check role/policy/claims
  -> Controller Action
     -> Application Service
     -> Infrastructure / Repository
  -> Response
```

### Những lỗi rất hay gặp khi mới làm JWT trong ASP.NET Core

- Quên `app.UseAuthentication()`
- Đặt `UseAuthorization()` trước `UseAuthentication()`
- `Issuer`, `Audience`, `SecretKey` ở lúc phát token và validate token không khớp nhau
- Dùng key quá ngắn
- Nhầm `ClaimTypes.NameIdentifier` với `JwtRegisteredClaimNames.Sub`
- Token có role nhưng không map đúng claim type
- FE không gửi header `Authorization: Bearer ...`
- Dùng `ClockSkew` quá lớn khiến token hết hạn vẫn còn sống lâu

### Khuyến nghị thực tế cho dự án của mình

Nếu mình làm theo hướng JWT chuẩn trong hệ sinh thái `ASP.NET Core`, mình sẽ chọn cách:

- Login tách riêng ở `AuthController`
- Dùng `IUserAuthenticationService` để xác thực tài khoản
- Dùng `ITokenService` để phát access token
- Cấu hình `AddJwtBearer(...)` trong `Program.cs`
- Dùng `[Authorize]`, `[Authorize(Roles = ...)]`, `[Authorize(Policy = ...)]`
- Không tự viết middleware parse JWT bằng tay
- Chỉ viết middleware bổ sung cho logging, tenant, audit, correlation

Sau khi nắm flow này, bước nâng cấp tự nhiên tiếp theo là:

- Thêm refresh token
- Thêm revoke
- Thêm rotation
- Thêm `BFF` nếu muốn browser không cầm access token

## Gợi ý chọn hướng cho dự án của chúng ta

Nếu mục tiêu là backend ASP.NET cho ứng dụng web có FE riêng bằng `Next.js`, mình tạm nghiêng về thứ tự ưu tiên sau:

### Hướng 1: Next.js + ASP.NET + Refresh token cookie

Phù hợp khi:

- FE là SPA hoặc hybrid app
- Muốn UX mượt
- Muốn kiểm soát refresh, revoke, rotation

Thiết kế:

- `access_token` ngắn hạn
- `refresh_token` trong `HttpOnly Secure SameSite cookie`
- FE không lưu access token vào `localStorage`
- Có endpoint `/auth/refresh`

### Hướng 2: Next.js BFF + ASP.NET API

Phù hợp khi:

- Muốn bảo mật cao hơn cho web
- Không muốn browser cầm bearer token

Thiết kế:

- Browser chỉ giữ cookie session với BFF
- BFF gọi ASP.NET API phía sau
- Token chỉ tồn tại ở server side

### Hướng 3: OIDC nếu cần login ngoài

Phù hợp khi:

- Có Google/Microsoft/SSO doanh nghiệp

Thiết kế:

- FE dùng `Auth.js` hoặc BFF
- API ASP.NET validate access token từ identity provider

## Kết luận ngắn

Nếu bám sát dự án thực tế hiện tại, lựa chọn cân bằng nhất thường là:

- `Next.js`
- `ASP.NET Core`
- `access_token` ngắn hạn
- `refresh_token` trong cookie `HttpOnly Secure SameSite`
- Refresh rotation
- Revoke token
- `CSRF protection`

Nếu ưu tiên bảo mật web app cao hơn nữa, nên đẩy sang mô hình `BFF`.

## Các điểm cần tiếp tục thảo luận

- FE của chúng ta là SPA thuần, SSR, hay có thể dùng BFF?
- FE và BE có cùng domain hay khác subdomain?
- Hệ thống có cần mobile app không?
- Có cần login Google/Microsoft/SSO doanh nghiệp không?
- Có cần revoke ngay khi user logout hoặc khóa tài khoản không?

## Lịch sử cập nhật

### v1.4 - 2026-04-22 11:33 (Asia/Bangkok)

- Bổ sung comment giải thích từng bước ngay trong các block code của `Question 4`
- Làm rõ hơn vai trò của `JwtOptions`, `ITokenService`, `JwtTokenService`, `Program.cs`, controller và `Next.js` client

### v1.3 - 2026-04-22 11:28 (Asia/Bangkok)

- Bổ sung hướng dẫn chi tiết về JWT Auth theo middleware/pipeline trong `ASP.NET Core`
- Thêm sơ đồ luồng hệ sinh thái và sơ đồ mapping với `Spring Security`
- Mở rộng phần code theo hướng controller, token service, user auth service, middleware và policy

### v1.2 - 2026-04-22 11:22 (Asia/Bangkok)

- Bổ sung phần minh họa code cho từng cơ chế auth
- Chọn `Next.js` cho FE và `ASP.NET Core` cho BE để sát với dự án hiện tại
- Thêm phần gợi ý chọn kiến trúc phù hợp cho dự án

### v1.1 - 2026-04-22 11:15 (Asia/Bangkok)

- Chuyển toàn bộ nội dung sang tiếng Việt có dấu
- Bổ sung metadata về phiên bản, thời điểm câu hỏi, thời điểm cập nhật
- Thêm quy ước để các lần cập nhật sau tiếp tục dùng cùng định dạng

### v1.0 - 2026-04-22 11:14 (Asia/Bangkok)

- Tạo file thảo luận ban đầu
- Trả lời câu hỏi về mức độ an toàn của cookie, refresh token, JWT Bearer
- Giải thích các cơ chế authentication phổ biến khác
