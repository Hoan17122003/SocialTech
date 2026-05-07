namespace SocialBackEnd.Common.DTOs.Mail;

public record WarningMailModel
(
    string Username,
    string WarningReason,
    string Location
);
