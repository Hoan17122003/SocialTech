using System;

namespace SocialBackEnd.Application.Ports.Outbound.cache;

public interface ICacheInternal
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);
    Task<bool> RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> ClearAsync(string keyPrefix, CancellationToken cancellationToken = default);
}
