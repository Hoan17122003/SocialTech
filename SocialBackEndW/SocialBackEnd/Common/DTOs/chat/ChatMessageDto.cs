
namespace SocialBackEnd.Common.DTOs.chat;

public record ChatMessageDto
{
    public int Id { get; init; }
    public string SenderId { get; init; } = string.Empty;
    public string SenderName { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public int? GroupId { get; init; } = null;
}