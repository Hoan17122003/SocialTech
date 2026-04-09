using System;

namespace SocialBackEnd.Domain.Entities;

public class Attachment
{
    public int Id { get; set; }
    public string FileName { get; set; }
    public string FileType { get; set; }
    public string FilePath { get; set; }
    public int? ArticleId { get; set; }
    public Article? Article { get; set; }
    public int? AuthorId { get; set; }
    public User? Author { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
