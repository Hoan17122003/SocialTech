namespace SocialBackEnd.Infrastructure.Notifications;

public interface IEmailAccessTokenProvider
{
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default);
}
