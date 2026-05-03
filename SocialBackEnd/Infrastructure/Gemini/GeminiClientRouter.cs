using System.Collections.Concurrent;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Options;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.Exceptions;

namespace SocialBackEnd.Infrastructure.Gemini;

public sealed class GeminiClientRouter : IGeminiClientRouter
{
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiClientRouter> _logger;
    private readonly IReadOnlyList<ClientSlot> _clients;
    private readonly ConcurrentDictionary<string, DateTimeOffset> _blockedKeysUntil = new(StringComparer.Ordinal);
    private int _nextClientIndex = -1;

    public GeminiClientRouter(
        IOptions<GeminiOptions> options,
        ILogger<GeminiClientRouter> logger)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var apiKeys = _options.ApiKeys
            .Where(static key => !string.IsNullOrWhiteSpace(key))
            .Select(static key => key.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (apiKeys.Count == 0)
        {
            throw new InvalidOperationException("Gemini API keys are not configured.");
        }

        _clients = apiKeys
            .Select(static key => new ClientSlot(key, new Client(apiKey: key)))
            .ToList();
    }

    public async Task<GeminiGenerateResponse> GenerateAsync(
        GeminiGenerateRequest request,
        CancellationToken cancellationToken = default)
    {
        var orderedClients = GetOrderedAvailableClients();
        if (orderedClients.Count == 0)
        {
            throw new AppException("All Gemini API keys are cooling down after quota exhaustion. Please retry shortly.");
        }

        Exception? lastException = null;
        var attempts = 0;

        foreach (var slot in orderedClients)
        {
            attempts++;

            try
            {
                var config = BuildConfig(request);
                var model = string.IsNullOrWhiteSpace(request.Model) ? _options.Model : request.Model.Trim();
                var response = await slot.Client.Models.GenerateContentAsync(
                    model: model,
                    contents: request.Prompt,
                    config: config);

                var text = ExtractText(response);
                if (string.IsNullOrWhiteSpace(text))
                {
                    throw new AppException("Gemini returned an empty response.");
                }

                return new GeminiGenerateResponse
                {
                    Text = text,
                    Model = model,
                    AttemptCount = attempts
                };
            }
            catch (ClientError ex) when (ShouldFailOver(ex))
            {
                lastException = ex;
                BlockKey(slot.ApiKey);
                _logger.LogWarning(
                    ex,
                    "Gemini key failed with status code {StatusCode} and status {Status}. Rotating to next key.",
                    ex.StatusCode,
                    ex.Status);
            }
            catch (HttpRequestException ex)
            {
                lastException = ex;
                _logger.LogWarning(ex, "Gemini request failed on current key. Trying next key.");
            }
        }

        throw new AppException(
            lastException?.Message ?? "Unable to generate content from Gemini with the configured API keys.");
    }

    private List<ClientSlot> GetOrderedAvailableClients()
    {
        var startIndex = Interlocked.Increment(ref _nextClientIndex);
        var now = DateTimeOffset.UtcNow;
        var result = new List<ClientSlot>(_clients.Count);

        for (var offset = 0; offset < _clients.Count; offset++)
        {
            var index = (startIndex + offset) % _clients.Count;
            if (index < 0)
            {
                index += _clients.Count;
            }

            var slot = _clients[index];
            if (_blockedKeysUntil.TryGetValue(slot.ApiKey, out var blockedUntil) && blockedUntil > now)
            {
                continue;
            }

            result.Add(slot);
        }

        return result;
    }

    private GenerateContentConfig? BuildConfig(GeminiGenerateRequest request)
    {
        var systemInstruction = string.IsNullOrWhiteSpace(request.SystemInstruction)
            ? _options.SystemInstruction
            : request.SystemInstruction;

        if (string.IsNullOrWhiteSpace(systemInstruction)
            && request.Temperature is null
            && request.MaxOutputTokens is null)
        {
            return null;
        }

        var config = new GenerateContentConfig();

        if (!string.IsNullOrWhiteSpace(systemInstruction))
        {
            config.SystemInstruction = new Content
            {
                Parts =
                [
                    new Part { Text = systemInstruction }
                ]
            };
        }

        if (request.Temperature.HasValue)
        {
            config.Temperature = request.Temperature.Value;
        }

        if (request.MaxOutputTokens.HasValue)
        {
            config.MaxOutputTokens = request.MaxOutputTokens.Value;
        }

        return config;
    }

    private static string ExtractText(GenerateContentResponse response)
    {
        return string.Join(
            string.Empty,
            response.Candidates?
                .SelectMany(static candidate => candidate.Content?.Parts ?? [])
                .Select(static part => part.Text)
                .Where(static text => !string.IsNullOrWhiteSpace(text))
            ?? []);
    }

    private bool ShouldFailOver(ClientError ex)
    {
        return ex.StatusCode == 429
            || string.Equals(ex.Status, "RESOURCE_EXHAUSTED", StringComparison.OrdinalIgnoreCase)
            || ex.StatusCode == 503
            || string.Equals(ex.Status, "UNAVAILABLE", StringComparison.OrdinalIgnoreCase);
    }

    private void BlockKey(string apiKey)
    {
        var cooldownMinutes = _options.QuotaCooldownMinutes <= 0 ? 15 : _options.QuotaCooldownMinutes;
        _blockedKeysUntil[apiKey] = DateTimeOffset.UtcNow.AddMinutes(cooldownMinutes);
    }

    private sealed record ClientSlot(string ApiKey, Client Client);
}
