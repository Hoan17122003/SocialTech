namespace SocialBackEnd.Common.DTOs.Comment;

public sealed record CommentRealtimeDto(
    int Id,
    int PostId,
    int AuthorId,
    string AuthorDisplayName,
    string AuthorAvatarUrl,
    string Body,
    string[] Attachments,
    DateTime CreatedAtUtc,
    bool IsPermissionEdit
);
