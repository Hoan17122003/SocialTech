namespace SocialBackEnd.Common.DTOs.Mail;

public record class WelcomeEmailModel
(
    string Username,
    string VerifyLink
);
