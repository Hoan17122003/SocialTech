using Elasticsearch.Net;
using Nest;
using SocialBackEnd.Application.Ports.Outbound.Search;

namespace SocialBackEnd.Infrastructure.Elasticsearch;

public static class ElasticSearchExtension
{
    public static void AddElasticsearch(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = configuration.GetSection("Elasticsearch");
        var configuredUri = settings["Uri"];
        if (string.IsNullOrWhiteSpace(configuredUri))
        {
            configuredUri = "http://localhost:9200";
        }
        else if (!configuredUri.Contains("://", StringComparison.Ordinal))
        {
            configuredUri = $"http://{configuredUri}";
        }

        var uri = new Uri(configuredUri);
        var defaultIndex = settings["DefaultIndex"];

        var connectionSettings = new ConnectionSettings(uri)
            .DefaultIndex(defaultIndex)
            .DefaultMappingFor<ChatMessageElasitcsearch>(m => m
                .IndexName(defaultIndex)
                .IdProperty(p => p.Id)// ID của document sẽ lấy từ property Id
            );
        // Nếu có xác thực
        if (!string.IsNullOrEmpty(settings["Username"]))
        {
            connectionSettings.BasicAuthentication(settings["Username"], settings["Password"]);
        }

        // / Tùy chỉnh CamelCase cho JSON(chuẩn.NET)
        connectionSettings
            .DefaultFieldNameInferrer(p => p.ToLower())
            .DisableDirectStreaming();

        var client = new ElasticClient(connectionSettings);
        services.AddSingleton<IElasticClient>(client);
        services.AddScoped<IChatSearchIndex, ElasticsearchChatSearchIndex>();
    }


}
