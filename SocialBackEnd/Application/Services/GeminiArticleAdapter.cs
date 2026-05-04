using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.LLM;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Constants;
using System.Text.Json;

namespace SocialBackEnd.Application.Services;

public sealed class GeminiArticleAdapter : GeminiAdapter, IGeminiArticlePort
{
    private readonly ILogger<GeminiArticleAdapter> _logger;
    private static readonly HashSet<string> SupportedGeminiMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    };

    public GeminiArticleAdapter(
        IGeminiClientRouter geminiClientRouter,
        ILogger<GeminiArticleAdapter> logger) : base(geminiClientRouter)
    {
        _logger = logger;
    }


    public async Task<bool> ValidateArticle(RequestCreateArticle requestCreateArticle)
    {
        var files = await BuildGeminiFilesAsync(requestCreateArticle.Attachments);
        var formatJson = JsonSerializer.Serialize(
            new FormatResponse.FormatResponseValidate
            {
                Result = $"{Constant.GeminiConfigModel25Flash.InAppropriateResult} or {Constant.GeminiConfigModel25Flash.ApproveResult}",
                Explain = "Reason why the post is InAppropriate Result or Approve Result."
            },
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            });

        var prompt = $"""
            {Constant.GeminiConfigModel25Flash.PromptValidateContent}

            Title: {requestCreateArticle.Title}
            Content: {requestCreateArticle.Content}
            Image count: {files.Count}
            Return only valid JSON using this shape:
            {formatJson}
            """;

        var config = new GeminiGenerateRequest
        {
            Prompt = prompt,
            Model = Constant.GeminiConfigModel25Flash.Model,
            Temperature = Constant.GeminiConfigModel25Flash.Temperature,
            MaxOutputTokens = Constant.GeminiConfigModel25Flash.MaxOutputTokens,
            SystemInstruction = Constant.GeminiConfigModel25Flash.SystemInstructionGenerateValidateContent,
            Files = files
        };
        var responseRaw = await GenerateAsync(config);
        var responseJson = ExtractJsonObject(responseRaw.Text);
        var response = JsonSerializer.Deserialize<FormatResponse.FormatResponseValidate>(
            responseJson,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        if (!string.IsNullOrEmpty(response!.Explain))
        {
            _logger.LogInformation($"Explain why have result: {response?.Explain}");
        }

        return string.Equals(response?.Result, Constant.GeminiConfigModel25Flash.ApproveResult, StringComparison.OrdinalIgnoreCase);
    }

    private static string ExtractJsonObject(string text)
    {
        var value = text.Trim();

        if (value.StartsWith("```", StringComparison.Ordinal))
        {
            var firstLineEnd = value.IndexOf('\n');
            if (firstLineEnd >= 0)
            {
                value = value[(firstLineEnd + 1)..].Trim();
            }

            if (value.EndsWith("```", StringComparison.Ordinal))
            {
                value = value[..^3].Trim();
            }
        }

        var startIndex = value.IndexOf('{');
        var endIndex = value.LastIndexOf('}');
        if (startIndex >= 0 && endIndex > startIndex)
        {
            return value[startIndex..(endIndex + 1)];
        }

        return value;
    }

    private static async Task<IReadOnlyList<GeminiGenerateFile>> BuildGeminiFilesAsync(
        IReadOnlyCollection<IFormFile>? attachments)
    {
        if (attachments is null || attachments.Count == 0)
        {
            return [];
        }

        var files = new List<GeminiGenerateFile>(attachments.Count);

        foreach (var attachment in attachments.Where(static file => file.Length > 0))
        {
            if (!SupportedGeminiMimeTypes.Contains(attachment.ContentType))
            {
                throw new AppException($"Unsupported Gemini attachment type: {attachment.ContentType}");
            }

            await using var stream = attachment.OpenReadStream();
            using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream);

            files.Add(new GeminiGenerateFile
            {
                FileName = attachment.FileName,
                MimeType = attachment.ContentType,
                Data = memoryStream.ToArray()
            });
        }

        return files;
    }
}
