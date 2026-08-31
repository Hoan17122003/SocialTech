using Minio.DataModel.Notification;

namespace SocialBackEnd.Application.Ports.Outbound
{
    public interface IMigrationsStorageFileHandler
    {
        Task HandlerAsync(string aggregateType,string eventType,DateTime processedOnUtc, string payload );
    }
}
