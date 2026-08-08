using Microsoft.Extensions.Options;
using CassandraCluster = Cassandra.ICluster;
using CassandraSession = Cassandra.ISession;

namespace SocialBackEnd.Infrastructure.chat;

/// <summary>
/// Quản lý và cung cấp Singleton Session kết nối tới cơ sở dữ liệu Cassandra.
/// Đảm bảo tự động cấu hình Keyspace và bảng chứa tin nhắn trong lần đầu kết nối.
/// </summary>
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

    /// <summary>
    /// Lấy Session kết nối tới Cassandra. 
    /// Phương thức này thread-safe và tự khởi tạo schema nếu là lần gọi đầu tiên.
    /// </summary>
    public async Task<CassandraSession> GetSessionAsync(CancellationToken cancellationToken = default)
    {
        if (_session is not null)
        {
            return _session;
        }

        // Khóa Semaphore để tránh việc khởi tạo nhiều Cluster/Session đồng thời từ nhiều luồng
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

            // Xây dựng Cassandra Cluster Builder
            // Lưu ý: ContactPoints không được chứa "localhost" trên môi trường Windows nếu container chỉ bind IPv4.
            // Nên sử dụng địa chỉ cụ thể như "127.0.0.1" để tránh Driver lỗi kết nối do phân giải ra IPv6 "::1".
            var builder = Cassandra.Cluster.Builder()
                .AddContactPoints(_options.ContactPoints)
                .WithPort(_options.Port);

            // Cấu hình Load Balancing Policy nếu có thông tin Local Datacenter
            if (!string.IsNullOrWhiteSpace(_options.LocalDatacenter))
            {
                builder = builder.WithLoadBalancingPolicy(
                    new Cassandra.DCAwareRoundRobinPolicy(_options.LocalDatacenter.Trim()));
            }

            _cluster = builder.Build();

            // Bước 1: Kết nối tạm thời tới Cassandra không chỉ định Keyspace để kiểm tra/khởi tạo Keyspace và các bảng.
            using (var tempSession = await _cluster.ConnectAsync().ConfigureAwait(false))
            {
                // Tạo Keyspace nếu chưa tồn tại (chế độ sao lưu SimpleStrategy với hệ số nhân replication = 1)
                await tempSession.ExecuteAsync(new Cassandra.SimpleStatement(
                    "CREATE KEYSPACE IF NOT EXISTS socialtech_chat " +
                    "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"
                )).ConfigureAwait(false);

                // Tạo bảng chat_messages_by_conversation nếu chưa tồn tại.
                // Phân vùng (Partition Key) theo conversation_key.
                // Khóa gom cụm (Clustering Key) theo sent_at_utc giảm dần và message_id giảm dần để tối ưu cho việc truy vấn tin nhắn mới nhất.
                await tempSession.ExecuteAsync(new Cassandra.SimpleStatement(
                    "CREATE TABLE IF NOT EXISTS socialtech_chat.chat_messages_by_conversation (" +
                    "  conversation_key text," +
                    "  sent_at_utc timestamp," +
                    "  message_id uuid," +
                    "  sender_user_id int," +
                    "  content text," +
                    "  client_message_id text," +
                    "  reply_to_message_id uuid," +
                    "  edited_at_utc timestamp," +
                    "  deleted_at_utc timestamp," +
                    "  state text," +
                    "  PRIMARY KEY ((conversation_key), sent_at_utc, message_id)" +
                    ") WITH CLUSTERING ORDER BY (sent_at_utc DESC, message_id DESC);"
                )).ConfigureAwait(false);
            }

            // Bước 2: Tạo kết nối chính thức gắn liền với Keyspace cấu hình trong appsettings
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
