using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Common.Events;
using SocialBackend.Common.Events;

namespace SocialBackEnd.Application.Ports.Outbound.Events;

public interface IApplicationEventPublisher
{
    Task PublishWelcomeEmailRequestedAsync(User user, string verifyLink, CancellationToken cancellationToken = default);
    Task PublishForgetPasswordEmailRequestedAsync(User user, string resetPasswordLink, CancellationToken cancellationToken = default);
    Task PublishArticleCreatedAsync(ArticleCreatedIntegrationEvent payload, CancellationToken cancellationToken = default);
    Task PublishCommentCreatedAsync(CommentCreatedIntegrationEvent payload, CancellationToken cancellationToken = default);
}
