# Cache Discussion

Tài liệu này tổng hợp lại cách project SocialBackEnd đang dùng cache, cách clear cache theo prefix trong Redis, và các best practice nên áp dụng khi làm việc với cache ở backend ASP.NET.

## 1. Cache trong project hiện tại

Project đang định nghĩa abstraction cache ở `Application/Ports/Outbound/cache/ICacheInternal.cs`:

```csharp
public interface ICacheInternal
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);
    Task<bool> RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> ClearAsync(string keyPrefix, CancellationToken cancellationToken = default);
}
```

Implementation nằm ở `Infrastructure/cache/CacheAdapter.cs`. Adapter này dùng hai tầng API:

- `IDistributedCache`: dùng cho các thao tác cơ bản như get, set, remove theo key cụ thể.
- `IConnectionMultiplexer` của `StackExchange.Redis`: dùng cho thao tác Redis-native, ví dụ scan key theo prefix để clear hàng loạt.

Trong `Program.cs`, Redis distributed cache được đăng ký bằng:

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetSection("RedisCacheSettings:Configuration").Value;
});
```

Trong `ServiceDependencyInjection.cs`, project đăng ký:

```csharp
services.AddScoped<ICacheInternal, CacheAdapter>();
services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var redisConfiguration = configuration.GetSection("RedisCacheSettings:Configuration").Value;
    return ConnectionMultiplexer.Connect(redisConfiguration!);
});
```

## 2. Vì sao cần cache?

Cache giúp giảm số lần gọi vào tài nguyên chậm hoặc đắt, ví dụ:

- Database query lặp lại nhiều lần.
- Token tạm thời như reset password token.
- Response của API ít thay đổi.
- Metadata, config, permission, profile summary.

Cache không phải source of truth. Source of truth vẫn là database hoặc hệ thống gốc. Cache chỉ là bản sao tạm để tăng tốc.

## 3. Key naming convention

Nên đặt key có cấu trúc rõ ràng:

```text
{Domain}:{Entity}:{Identifier}
```

Ví dụ:

```text
ForgetPasswordToken:user@example.com
UserProfile:123
ArticleDetail:456
Permission:User:123
```

Với reset password hiện tại:

```csharp
var cacheKey = $"ForgetPasswordToken:{normalizedEmail}";
```

Prefix để clear toàn bộ reset password token là:

```csharp
await _cacheInternal.ClearAsync("ForgetPasswordToken:");
```

## 4. Set cache

`SetAsync` hiện serialize value thành JSON rồi lưu bằng `IDistributedCache`:

```csharp
var valueJson = JsonSerializer.Serialize(value);
await _cache.SetStringAsync(key, valueJson, new DistributedCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5)
}, cancellationToken);
```

Cách dùng:

```csharp
await _cacheInternal.SetAsync(
    "UserProfile:123",
    profile,
    TimeSpan.FromMinutes(10));
```

Best practice:

- Luôn đặt expiration cho cache.
- Không cache dữ liệu quá lớn.
- Không cache object chứa secret hoặc dữ liệu nhạy cảm nếu không thật sự cần.
- Key phải ổn định, dễ đoán, dễ clear.
- Nên normalize input trước khi tạo key, ví dụ email nên trim/lowercase.

## 5. Get cache

Cách dùng:

```csharp
var profile = await _cacheInternal.GetAsync<UserProfileModel>("UserProfile:123");
if (profile is not null)
{
    return profile;
}

profile = await _repository.GetProfileAsync(123);
await _cacheInternal.SetAsync("UserProfile:123", profile, TimeSpan.FromMinutes(10));
return profile;
```

Pattern này gọi là cache-aside:

1. App thử đọc cache trước.
2. Nếu cache hit thì trả về luôn.
3. Nếu cache miss thì đọc database.
4. Sau đó ghi lại vào cache.

## 6. Remove cache theo key

Khi biết chính xác key cần xóa:

```csharp
await _cacheInternal.RemoveAsync("UserProfile:123");
```

Nên remove cache khi dữ liệu gốc thay đổi, ví dụ sau khi update profile:

```csharp
await _repository.UpdateUserAsync(userId, request);
await _cacheInternal.RemoveAsync($"UserProfile:{userId}");
```

## 7. Clear cache theo prefix

`IDistributedCache` không hỗ trợ list key theo prefix. Vì vậy project dùng `IConnectionMultiplexer` để truy cập Redis server và scan key:

```csharp
public async Task<bool> ClearAsync(string keyPrefix, CancellationToken cancellationToken = default)
{
    if (string.IsNullOrWhiteSpace(keyPrefix))
    {
        throw new ArgumentException("Key prefix is required.", nameof(keyPrefix));
    }

    var database = _redis.GetDatabase();
    var pattern = $"{keyPrefix}*";

    foreach (var endPoint in _redis.GetEndPoints())
    {
        var server = _redis.GetServer(endPoint);
        if (!server.IsConnected || server.IsReplica)
        {
            continue;
        }

        foreach (var key in server.Keys(pattern: pattern))
        {
            cancellationToken.ThrowIfCancellationRequested();
            await database.KeyDeleteAsync(key);
        }
    }

    return true;
}
```

Cách dùng:

```csharp
await _cacheInternal.ClearAsync("ForgetPasswordToken:");
await _cacheInternal.ClearAsync("UserProfile:");
```

Lưu ý quan trọng:

- Không nên dùng Redis command `KEYS prefix:*` trong production vì có thể block Redis.
- `server.Keys(...)` trong StackExchange.Redis dùng SCAN khi server hỗ trợ, tốt hơn `KEYS`, nhưng vẫn nên dùng cẩn thận với hệ thống lớn.
- Với hệ thống lớn, nên lưu danh sách key theo group bằng Redis Set thay vì scan toàn bộ keyspace.

## 8. Best practice khi dùng cache

### 8.1. Không cache mọi thứ

Chỉ cache khi dữ liệu:

- Được đọc nhiều hơn ghi.
- Tốn chi phí để tính toán hoặc truy vấn.
- Có thể chấp nhận stale trong một khoảng thời gian.

Không nên cache dữ liệu luôn thay đổi từng giây nếu không có chiến lược invalidation rõ ràng.

### 8.2. TTL phải phù hợp nghiệp vụ

Ví dụ:

- Reset password token: 2-5 phút.
- User profile: 5-15 phút.
- Article detail: 5-30 phút.
- Static config: 30-120 phút.

TTL quá ngắn thì cache ít tác dụng. TTL quá dài thì dữ liệu dễ stale.

### 8.3. Invalidation phải rõ ràng

Khi dữ liệu thay đổi, nên xóa cache liên quan:

```csharp
await _repository.UpdateUserAsync(userId, request);
await _cacheInternal.RemoveAsync($"UserProfile:{userId}");
```

Nếu một hành động ảnh hưởng nhiều key cùng nhóm, dùng prefix:

```csharp
await _cacheInternal.ClearAsync("UserProfile:");
```

### 8.4. Tránh cache stampede

Cache stampede xảy ra khi một key hết hạn, nhiều request cùng lúc miss cache và cùng gọi database. Cách xử lý:

- Dùng lock phân tán cho key nóng.
- Thêm jitter vào TTL để các key không hết hạn cùng lúc.
- Cho phép stale-while-revalidate với dữ liệu ít nhạy cảm.

### 8.5. Không dùng cache thay database

Cache có thể mất dữ liệu bất cứ lúc nào. Logic nghiệp vụ không được phụ thuộc vào việc cache chắc chắn tồn tại, trừ các token/session tạm thời được thiết kế rõ là sống trong cache.

### 8.6. Serialize rõ ràng

Project đang dùng `System.Text.Json`. Nên giữ model cache đơn giản, tránh object graph phức tạp hoặc chứa navigation property EF Core.

### 8.7. Async end-to-end

Cache là I/O. Nên dùng async/await:

```csharp
await _cacheInternal.GetAsync<T>(key);
await _cacheInternal.SetAsync(key, value);
await _cacheInternal.RemoveAsync(key);
```

Tránh `.Result` và `.Wait()` vì có thể block thread, giảm throughput và gây deadlock trong một số context.

## 9. Gợi ý cải thiện cho code hiện tại

Trong `SetAsync`, không cần check key tồn tại trước khi set. Redis set lại cùng key là bình thường:

```csharp
public async Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
{
    var valueJson = JsonSerializer.Serialize(value);
    await _cache.SetStringAsync(key, valueJson, new DistributedCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5)
    }, cancellationToken);

    return true;
}
```

Nên sửa return type trong implementation cho khớp interface:

```csharp
public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
```

Hiện implementation đang là `Task<T>`, nên build có warning nullability.
