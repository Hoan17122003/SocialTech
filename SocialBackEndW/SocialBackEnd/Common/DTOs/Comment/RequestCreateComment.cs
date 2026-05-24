
using System.ComponentModel.DataAnnotations;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Common.DTOs.Article
{
    public record RequestCreateComment
    {
        [Required]
        [MinLength(1), MaxLength(5000)]
        public string Body { get; set; }

        public int? ParentCommentId { get; set; } = null;

        public CommentStatus status { get; set; } = CommentStatus.Published;

        [Required]
        public int Depth { get; set; } = 0;

        public List<IFormFile>? Attachments { get; set; } = new List<IFormFile>();
    }
}