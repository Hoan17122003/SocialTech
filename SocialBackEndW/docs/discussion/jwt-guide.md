# JWT Guide

Tài liệu này giải thích cách dùng JWT provider trong ASP.NET Core theo code hiện tại của SocialBackEnd, bao gồm cách phát token, cấu hình middleware validate token, đọc claims trong controller và các best practice bảo mật.

## 1. JWT là gì?

JWT, viết tắt của JSON Web Token, là một chuỗi token chứa claims về user. Server ký token bằng secret key hoặc private key. Client gửi token trong mỗi request, thường qua header:

```http
Authorization: Bearer <access_token>
```

ASP.NET Core JWT Bearer middleware sẽ:

1. Đọc bearer token từ request.
2. Validate chữ ký.
3. Validate issuer, audience, lifetime.
4. Nếu hợp lệ, tạo `ClaimsPrincipal` và gán vào `HttpContext.User`.
5. `[Authorize]` dùng `HttpContext.User` để quyết định request có được đi tiếp không.

## 2. Cấu hình options

Project đang có model `Common/Models/JwtOptions.cs`:

```csharp
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { init; get; } = string.Empty;
    public string Audience { init; get; } = string.Empty;
    public string SecretKey { init; get; } = string.Empty;
    public int AccessTokenMinutes { init; get; } = 15;
}
```

Ví dụ cấu hình trong `appsettings.json` hoặc secret/env:

```json
{
  "Jwt": {
    "Issuer": "SocialBackEnd",
    "Audience": "SocialBackEnd.Client",
    "SecretKey": "a-very-long-secret-key-at-least-32-bytes",
    "AccessTokenMinutes": 15
  }
}
```

Lưu ý:

- `SecretKey` phải đủ dài, project đang check tối thiểu 32 bytes cho HS256.
- Không commit secret thật vào git.
- Production nên lấy secret từ environment variable, secret manager hoặc vault.

## 3. Đăng ký JWT provider trong ASP.NET Core

Code nằm ở `Infrastructure/Security/SecurityConfigurationExtensions.cs`.

Đầu tiên bind config:

```csharp
services.Configure<JwtOptions>(
    configuration.GetSection(JwtOptions.SectionName));
```

Sau đó đọc options ngay lúc startup để cấu hình middleware:

```csharp
var jwtOptions = configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? throw new InvalidOperationException("Missing JWT configuration.");
```

Project kiểm tra secret key:

```csharp
if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) || Encoding.UTF8.GetByteCount(jwtOptions.SecretKey) < 32)
{
    throw new InvalidOperationException("JWT SecretKey must be at least 32 bytes for HS256.");
}
```

Sau đó đăng ký JWT Bearer authentication:

```csharp
services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = true;
        options.SaveToken = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
```

Ý nghĩa các flag chính:

- `ValidateIssuer`: chỉ nhận token do đúng issuer phát hành.
- `ValidateAudience`: chỉ nhận token dành cho đúng audience.
- `ValidateLifetime`: reject token hết hạn.
- `ValidateIssuerSigningKey`: kiểm tra chữ ký token.
- `ClockSkew`: cho phép lệch thời gian nhỏ giữa client/server.

## 4. Gắn middleware vào request pipeline

Trong `UseSecurityConfiguration`:

```csharp
app.UseAuthentication();
app.UseAuthorization();
```

Thứ tự rất quan trọng:

1. `UseAuthentication()` đọc token và set `HttpContext.User`.
2. `UseAuthorization()` dùng user đó để check `[Authorize]` hoặc policy.

Trong `Program.cs`, project gọi:

```csharp
app.UseSecurityConfiguration();
```

## 5. Tạo JWT access token

Code nằm ở `Infrastructure/Security/JwtTokenService.cs`.

Service inject options theo pattern chuẩn:

```csharp
public JwtTokenService(IOptions<JwtOptions> options)
{
    _options = options.Value;
}
```

Khi tạo token, service đưa các claims cơ bản vào token:

```csharp
var claims = new List<Claim>
{
    new (JwtRegisteredClaimNames.Sub, user.UserId),
    new (JwtRegisteredClaimNames.Email, user.Email),
    new (ClaimTypes.NameIdentifier, user.UserId),
    new (ClaimTypes.Email, user.Email)
};
```

Sau đó thêm roles và permissions:

```csharp
foreach (var role in user.Roles)
{
    claims.Add(new Claim(ClaimTypes.Role, role));
}

foreach (var permission in user.Permissions)
{
    claims.Add(new Claim("permission", permission));
}
```

Tạo signing key và credentials:

```csharp
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
```

Tạo token:

```csharp
var token = new JwtSecurityToken(
    issuer: _options.Issuer,
    audience: _options.Audience,
    claims: claims,
    expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
    signingCredentials: credentials);

return new JwtSecurityTokenHandler().WriteToken(token);
```

## 6. Dùng `[Authorize]` trong controller

Ví dụ trong `UserController`:

```csharp
[Authorize]
[HttpPost("profile/{id}")]
public async Task<IActionResult> GetUserProfile([FromRoute(Name = "id")] int userIdTarget)
{
    var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!int.TryParse(userIdClaim, out var userId))
    {
        return Unauthorized(ApiResponse<string>.Fail("Token không chứa user id hợp lệ."));
    }

    var result = await _userPort.GetUserProfileAsync(userIdTarget, userId);
    return Ok(ApiResponse<ProfileModelView>.Ok(result, "Success"));
}
```

Khi request đi qua `[Authorize]`, middleware đã validate token trước. Controller chỉ cần đọc claim từ `User`.

## 7. Authorization policy

Project có policy:

```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy("CanWriteUsers", policy =>
        policy.RequireClaim("permission", "users.write"));
});
```

Cách dùng:

```csharp
[Authorize(Policy = "CanWriteUsers")]
public IActionResult UpdateUser(...)
{
    ...
}
```

Policy phù hợp khi quyền không chỉ là đăng nhập, mà cần permission cụ thể.

## 8. Validate JWT thủ công

Một số flow không đi qua middleware `[Authorize]`, ví dụ reset password token nằm trong query string. Khi đó có thể validate JWT thủ công bằng `JwtSecurityTokenHandler`:

```csharp
var principal = tokenHandler.ValidateToken(tokenOfJwt, new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,
    ValidIssuer = jwtOptions.Issuer,
    ValidAudience = jwtOptions.Audience,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
    ClockSkew = TimeSpan.FromSeconds(30)
}, out _);

var email = principal.FindFirstValue(ClaimTypes.Email)
    ?? principal.FindFirstValue(JwtRegisteredClaimNames.Email);
```

Đây là pattern đang dùng trong flow reset password: decode JWT để lấy email, sau đó dùng email build cache key `ForgetPasswordToken:{email}`.

## 9. Best practice JWT

### 9.1. Access token nên ngắn hạn

Access token nên sống ngắn, ví dụ 15 phút. Nếu cần login lâu dài, dùng refresh token riêng, lưu refresh token an toàn ở database và có cơ chế revoke.

### 9.2. Không nhét dữ liệu nhạy cảm vào JWT

JWT không phải mã hóa, chỉ là base64url encoded và được ký. Client có thể đọc payload. Không đưa password hash, secret, token OAuth, hoặc thông tin riêng tư không cần thiết vào JWT.

### 9.3. Validate issuer/audience/signature/lifetime

Không tắt các flag này trong production:

```csharp
ValidateIssuer = true;
ValidateAudience = true;
ValidateLifetime = true;
ValidateIssuerSigningKey = true;
```

### 9.4. Secret key phải đủ mạnh

Với HS256, secret phải dài và random. Không dùng chuỗi dễ đoán như `my-secret`, `123456`, `socialtech`.

### 9.5. Dùng UTC cho thời gian

Khi tạo token, dùng:

```csharp
DateTime.UtcNow
```

Không dùng local time để tránh lỗi timezone.

### 9.6. Token revoke

JWT access token stateless nên khó revoke ngay lập tức nếu không có blacklist hoặc token version. Với các use case cần revoke mạnh:

- Dùng access token ngắn hạn.
- Lưu refresh token trong DB.
- Có `tokenVersion` hoặc `securityStamp` để invalidate token cũ.
- Với reset password, lưu token trong cache và xóa sau khi dùng.

## 10. Checklist khi thêm endpoint cần auth

1. Gắn `[Authorize]` vào action/controller.
2. Đảm bảo client gửi header `Authorization: Bearer <token>`.
3. Đọc `ClaimTypes.NameIdentifier` để lấy user id.
4. Nếu cần quyền cụ thể, dùng policy.
5. Không tin user id truyền từ body nếu có thể lấy từ token.
