using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Infrastructure.Notifications;

public sealed class MailAdapter : IEmailPortOut
{
    private readonly SmtpOptions _smtpOptions;
    private readonly IEmailAccessTokenProvider _accessTokenProvider;
    private readonly ILogger<MailAdapter> _logger;

    public MailAdapter(
        IOptions<SmtpOptions> smtpOptions,
        IEmailAccessTokenProvider accessTokenProvider,
        ILogger<MailAdapter> logger)
    {
        _smtpOptions = smtpOptions?.Value ?? throw new ArgumentNullException(nameof(smtpOptions));
        _accessTokenProvider = accessTokenProvider ?? throw new ArgumentNullException(nameof(accessTokenProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task SendAsync(EmailMessage emailMessage, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(emailMessage);
        ValidateOptions();

        var mimeMessage = new MimeMessage();
        mimeMessage.From.Add(new MailboxAddress(_smtpOptions.FromName, _smtpOptions.FromEmail));
        mimeMessage.To.Add(MailboxAddress.Parse(emailMessage.To));
        mimeMessage.Subject = emailMessage.Subject;

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = emailMessage.HtmlBody,
            TextBody = emailMessage.TextBody
        };

        mimeMessage.Body = bodyBuilder.ToMessageBody();

        using var smtpClient = new SmtpClient();
        var socketOptions = _smtpOptions.UseSsl
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        await smtpClient.ConnectAsync(
            _smtpOptions.Host,
            _smtpOptions.Port,
            socketOptions,
            cancellationToken);

        var accessToken = await _accessTokenProvider.GetAccessTokenAsync(cancellationToken);
        var oauth2 = new SaslMechanismOAuth2(_smtpOptions.FromEmail, accessToken);
        await smtpClient.AuthenticateAsync(oauth2, cancellationToken);

        await smtpClient.SendAsync(mimeMessage, cancellationToken);
        await smtpClient.DisconnectAsync(true, cancellationToken);

        _logger.LogInformation(
            "Sent email to {Recipient} with subject {Subject}",
            emailMessage.To,
            emailMessage.Subject);
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(_smtpOptions.Host))
        {
            throw new InvalidOperationException("Smtp:Host is not configured.");
        }

        if (_smtpOptions.Port <= 0)
        {
            throw new InvalidOperationException("Smtp:Port must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.FromEmail))
        {
            throw new InvalidOperationException("Smtp:FromEmail is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.OAuth2.TokenEndpoint))
        {
            throw new InvalidOperationException("Smtp:OAuth2:TokenEndpoint is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.OAuth2.ClientId))
        {
            throw new InvalidOperationException("Smtp:OAuth2:ClientId is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.OAuth2.ClientSecret))
        {
            throw new InvalidOperationException("Smtp:OAuth2:ClientSecret is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.OAuth2.RefreshToken))
        {
            throw new InvalidOperationException("Smtp:OAuth2:RefreshToken is not configured.");
        }
    }

}
