using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Application.Ports.Outbound;

public interface IEmailPortOut
{
    Task SendAsync(EmailMessage emailMessage, CancellationToken cancellationToken = default);
}
