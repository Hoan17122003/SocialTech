using System;
using System.Text.Json.Serialization;

namespace SocialBackEnd.Domain.Entities;

public class Attachments : EntityBase
{
    public string FilePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int? PostId { get; set; }
    [JsonIgnore] // Ngăn JsonSerializer lặp ngược lại Post
    public Post? Post { get; set; } = null!;
    public int? CommentId { get; set; } = null;
    public Comment? Comment { get; set; } = null!;
}
