using Microsoft.Extensions.DependencyInjection;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Application.Notifications;

public sealed class NotificationService : IEmailNotificationService
{
    private readonly IEmailPortOut _emailPortOut;
    private readonly IServiceProvider _serviceProvider;

    public NotificationService(IEmailPortOut emailPortOut, IServiceProvider serviceProvider)
    {
        _emailPortOut = emailPortOut ?? throw new ArgumentNullException(nameof(emailPortOut));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    }

    public Task SendEmailAsync<TModel>(string to, TModel model, CancellationToken cancellationToken = default) where TModel : class
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(to);
        ArgumentNullException.ThrowIfNull(model);

        var renderer = _serviceProvider.GetRequiredService<IEmailTemplateRenderer<TModel>>();
        var emailMessage = new EmailMessage(
            to,
            renderer.RenderSubject(model),
            renderer.RenderHtmlBody(model),
            renderer.RenderTextBody(model));

        return _emailPortOut.SendAsync(emailMessage, cancellationToken);
    }

}
