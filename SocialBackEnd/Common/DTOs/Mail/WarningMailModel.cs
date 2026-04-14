namespace SocialBackEnd.Common.DTOs.Mail;

public record class WarningMailModel
(
    string Username,
    string WarningReason,
    string Location
);
