namespace SocialBackEnd.Common.DTOs.Mail;

public record class ForgetPasswordEmailModel
(
    string Username,
    string ResetPasswordLink
);
