using Nest;
using SocialBackEnd.Application.Ports.Outbound.Search;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Elasticsearch;

public sealed class ElasticsearchChatSearchIndex : IChatSearchIndex
{
    private const string IndexName = "socialtech-messages-v1";
    private readonly IElasticClient _client;
    public ElasticsearchChatSearchIndex(IElasticClient client) => _client = client;

    public async Task IndexAsync(ChatMessage message, string senderName, CancellationToken cancellationToken = default)
    {
        await EnsureIndexAsync(cancellationToken);
        var doc = new ChatMessageElasitcsearch { Id = message.MessageId.ToString("N"), ConversationId = message.ConversationKey, SenderId = message.SenderUserId.ToString(), SenderName = senderName, Content = message.Content, CreatedAt = message.SentAtUtc.UtcDateTime };
        var response = await _client.IndexAsync(doc, x => x.Index(IndexName).Id(doc.Id), cancellationToken);
        if (!response.IsValid) throw new InvalidOperationException(response.OriginalException?.Message ?? "Elasticsearch indexing failed.");
    }

    public async Task<IReadOnlyList<ChatMessage>> SearchAsync(string conversationKey, string query, int take, CancellationToken cancellationToken = default)
    {
        await EnsureIndexAsync(cancellationToken);
        var response = await _client.SearchAsync<ChatMessageElasitcsearch>(s => s.Index(IndexName).Size(Math.Clamp(take, 1, 100)).Query(q => q.Bool(b => b.Filter(f => f.Term(t => t.Field(x => x.ConversationId).Value(conversationKey)), f => f.Term(t => t.Field(x => x.IsDeleted).Value(false))).Must(m => m.Match(x => x.Field(f => f.Content).Query(query))))), cancellationToken);
        if (!response.IsValid) throw new InvalidOperationException(response.OriginalException?.Message ?? "Elasticsearch search failed.");
        return response.Documents.Select(x => ChatMessage.Create(x.ConversationId, int.Parse(x.SenderId), x.Content, sentAtUtc: new DateTimeOffset(DateTime.SpecifyKind(x.CreatedAt, DateTimeKind.Utc)))).ToList();
    }

    private async Task EnsureIndexAsync(CancellationToken token)
    {
        if (!(await _client.Indices.ExistsAsync(IndexName, ct: token)).Exists)
            await _client.Indices.CreateAsync(IndexName, x => x.Map<ChatMessageElasitcsearch>(m => m.AutoMap()), token);
    }
}
