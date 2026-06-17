namespace SocialBackEnd.Infrastructure.chat;

public sealed class CassandraOptions
{
    public const string SectionName = "Cassandra";

    public string[] ContactPoints { get; set; } = Array.Empty<string>();
    public int Port { get; set; } = 9042;
    public string Keyspace { get; set; } = string.Empty;
    public string LocalDatacenter { get; set; } = string.Empty;
}
