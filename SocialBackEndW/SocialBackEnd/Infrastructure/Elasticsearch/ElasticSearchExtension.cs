using Elasticsearch.Net;
using Nest;

namespace SocialBackEnd.Infrastructure.Elasticsearch;

public static class ElasticSearchExtension
{
    public static void AddElasticsearch(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = configuration.GetSection("Elasticsearch");
        var uri = new Uri(settings["Uri"]);
        var defaultIndex = settings["DefaultIndex"];

        var connectionSettings = new ConnectionSettings(uri)
            .DefaultIndex(defaultIndex)
            .DefaultMappingFor<ChatMessage>(m => m
                .IndexName(defaultIndex)
                .IdProperty(p => p.Id)// ID của document sẽ lấy từ property Id
            );
        // Nếu có xác thực
        if (!string.IsNullOrEmpty(settings["Username"]))
        {
            connectionSettings.BasicAuthentication(settings["Username"], settings["Password"]);
        }

        // / Tùy chỉnh CamelCase cho JSON(chuẩn.NET)
        connectionSettings.DefaultFieldNameInferrer(p => p.ToLower());

        var client = new ElasticClient(connectionSettings);
        services.AddSingleton(client); // Đăng ký Singleton vì client là thread-safe
    }


}