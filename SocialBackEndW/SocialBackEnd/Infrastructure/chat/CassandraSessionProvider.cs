using Microsoft.Extensions.Options;
using CassandraCluster = Cassandra.ICluster;
using CassandraSession = Cassandra.ISession;

namespace SocialBackEnd.Infrastructure.chat;

public sealed class CassandraSessionProvider : ICassandraSessionProvider, IDisposable
{
    private readonly CassandraOptions _options;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private CassandraCluster? _cluster;
    private CassandraSession? _session;

    public CassandraSessionProvider(IOptions<CassandraOptions> options)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    }

    public async Task<CassandraSession> GetSessionAsync(CancellationToken cancellationToken = default)
    {
        if (_session is not null)
        {
            return _session;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_session is not null)
            {
                return _session;
            }

            if (_options.ContactPoints.Length == 0)
            {
                throw new InvalidOperationException("Cassandra:ContactPoints is not configured.");
            }

            if (string.IsNullOrWhiteSpace(_options.Keyspace))
            {
                throw new InvalidOperationException("Cassandra:Keyspace is not configured.");
            }

            var builder = Cassandra.Cluster.Builder()
                .AddContactPoints(_options.ContactPoints)
                .WithPort(_options.Port);

            if (!string.IsNullOrWhiteSpace(_options.LocalDatacenter))
            {
                builder = builder.WithLoadBalancingPolicy(
                    new Cassandra.DCAwareRoundRobinPolicy(_options.LocalDatacenter.Trim()));
            }

            _cluster = builder.Build();
            _session = await _cluster.ConnectAsync(_options.Keyspace).ConfigureAwait(false);
            return _session;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Dispose()
    {
        _session?.Dispose();
        _cluster?.Dispose();
        _lock.Dispose();
    }
}
