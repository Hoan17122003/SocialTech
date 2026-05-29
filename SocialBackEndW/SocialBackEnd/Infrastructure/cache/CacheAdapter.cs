using System;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using SocialBackEnd.Application.Ports.Outbound.cache;
using StackExchange.Redis;

namespace SocialBackEnd.Infrastructure.cache;

public class CacheAdapter : ICacheInternal
{
    private readonly IDistributedCache _cache;

    private readonly IConnectionMultiplexer _redis;
    private const int MaxAttemptsLogin = 10;
    private static readonly TimeSpan BlockTime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan FailCounterTtl = TimeSpan.FromMinutes(15);
    public CacheAdapter(IDistributedCache cache, IConnectionMultiplexer redis)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
    }

    public async Task<T> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var valueJson = await _cache.GetStringAsync(key, cancellationToken);
        if (valueJson is null)
        {
            return default!;
        }
        var value = JsonSerializer.Deserialize<T>(valueJson);
        return value ?? default!;
    }

    public async Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        var keyCacheExists = _cache.GetString(key);
        if (keyCacheExists != null)
        {
            await _cache.RemoveAsync(key, cancellationToken);
        }
        var valueJson = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(key, valueJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5)
        }, cancellationToken);
        return true;
    }

    public async Task<bool> RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await _cache.RemoveAsync(key, cancellationToken);
        return true;
    }

    public async Task<bool> ClearAsync(string keyPrefix, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyPrefix))
        {
            throw new ArgumentException("Key prefix is required.", nameof(keyPrefix));
        }
        var database = _redis.GetDatabase();
        var parttern = $"{keyPrefix}*";
        foreach (var endPoint in _redis.GetEndPoints())
        {
            var server = _redis.GetServer(endPoint);
            if (!server.IsConnected || server.IsReplica)
            {
                continue;
            }
            foreach (var key in server.Keys(pattern: parttern))
            {
                cancellationToken.ThrowIfCancellationRequested();
                await database.KeyDeleteAsync(key);
            }
        }
        return true;
    }

    public async Task<long> IncreaseFailedAttemptAsync(string username)
    {
        var failKey = FailKey(username);
        var blockKey = BlockKey(username);
        var db = _redis.GetDatabase();

        var count = await db.StringIncrementAsync(failKey);

        if (count == 1)
        {
            await db.KeyExpireAsync(failKey, FailCounterTtl);
        }

        if (count >= MaxAttemptsLogin)
        {
            await db.StringSetAsync(
                blockKey,
                "1",
                BlockTime);

            await db.KeyDeleteAsync(failKey);
        }

        return count;
    }

    private static string FailKey(string username)
      => $"login:fail:{username.ToLowerInvariant()}";

    private static string BlockKey(string username)
     => $"login:block:{username.ToLowerInvariant()}";

    public async Task<bool> IsBlockedAsync(string username)
    {
        var db = _redis.GetDatabase();
        return await db.KeyExistsAsync(BlockKey(username));
    }

    public async Task<long> GetFailedCountAsync(string username)
    {
        var db = _redis.GetDatabase();
        var value = await db.StringGetAsync(FailKey(username));

        if (value.IsNullOrEmpty)
            return 0;

        return (long)value;
    }

    public async Task ResetFailedAttemptAsync(string username)
    {
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync(FailKey(username));
        await db.KeyDeleteAsync(BlockKey(username));
    }
    public async Task<TimeSpan?> GetBlockRemainingTimeAsync(string username)
    {
        var db = _redis.GetDatabase();
        return await db.KeyTimeToLiveAsync(BlockKey(username));
    }

}
