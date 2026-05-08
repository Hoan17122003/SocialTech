namespace SocialBackEnd.Common.DTOs.Mail;

public record WelcomeEmailModel
(
    string Username,
    string VerifyLink
);
