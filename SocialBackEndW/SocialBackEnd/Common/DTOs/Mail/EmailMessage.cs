namespace SocialBackEnd.Common.DTOs.Mail;

public sealed record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    string? TextBody = null
);
