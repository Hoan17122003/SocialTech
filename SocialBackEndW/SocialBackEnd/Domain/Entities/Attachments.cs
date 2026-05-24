using System;

namespace SocialBackEnd.Domain.Entities;

public class Attachments : EntityBase
{
    public string FilePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public int? CommentId { get; set; } = null;
    public Comment? Comment { get; set; } = null!;
}
