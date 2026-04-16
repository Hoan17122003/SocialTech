namespace SocialBackEnd.Application.Notifications;

public interface IEmailNotificationService
{
    Task SendEmailAsync<TModel>(
           string to,
           TModel model,
           CancellationToken cancellationToken = default)
           where TModel : class;
}
