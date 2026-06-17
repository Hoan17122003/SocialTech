using CassandraSession = Cassandra.ISession;

namespace SocialBackEnd.Infrastructure.chat;

public interface ICassandraSessionProvider
{
    Task<CassandraSession> GetSessionAsync(CancellationToken cancellationToken = default);
}
