namespace SocialBackEnd.Common.DTOs.Mail;

public record ForgetPasswordEmailModel
(
    string Username,
    string ResetPasswordLink
);
