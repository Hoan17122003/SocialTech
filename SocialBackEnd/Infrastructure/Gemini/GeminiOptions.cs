namespace SocialBackEnd.Infrastructure.Gemini;

public sealed class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string Model { get; set; } = "gemini-2.5-flash";

    public string? SystemInstruction { get; set; }

    public int QuotaCooldownMinutes { get; set; } = 15;

    public List<string> ApiKeys { get; set; } = [];
}
