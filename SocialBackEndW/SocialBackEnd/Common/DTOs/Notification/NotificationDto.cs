namespace SocialBackEnd.Common.DTOs.Notification;

public sealed record NotificationDto(
    int Id,
    string Message,
    bool IsRead,
    DateTime CreatedAtUtc,
    DateTime? ReadAtUtc);
