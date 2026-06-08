

namespace SocialBackEnd.Common.Models.chat;

public record MessageEditResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? UpdatedContent { get; init; }
}