using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Common.DTOs.Comment;

public record RequestUpdateComment
{
    public string? Body { get; set; }
    public CommentStatus? status { get; set; }
    public List<IFormFile>? Attachments { get; set; } = new List<IFormFile>();
}