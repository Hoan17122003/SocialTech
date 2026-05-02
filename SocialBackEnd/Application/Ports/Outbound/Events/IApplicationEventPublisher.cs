using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Events;

public interface IApplicationEventPublisher
{
    Task PublishWelcomeEmailRequestedAsync(User user, string verifyLink, CancellationToken cancellationToken = default);
    Task PublishForgetPasswordEmailRequestedAsync(User user, string resetPasswordLink, CancellationToken cancellationToken = default);
    Task PublishArticleCreatedAsync(Post post, int attachmentCount, CancellationToken cancellationToken = default);
}
