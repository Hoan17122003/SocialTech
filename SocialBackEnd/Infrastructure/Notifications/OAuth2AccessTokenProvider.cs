using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace SocialBackEnd.Infrastructure.Notifications;

public sealed class OAuth2AccessTokenProvider : IEmailAccessTokenProvider
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly SmtpOptions _smtpOptions;
    private readonly ILogger<OAuth2AccessTokenProvider> _logger;

    public OAuth2AccessTokenProvider(
        HttpClient httpClient,
        IOptions<SmtpOptions> smtpOptions,
        ILogger<OAuth2AccessTokenProvider> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _smtpOptions = smtpOptions?.Value ?? throw new ArgumentNullException(nameof(smtpOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        var oauthOptions = _smtpOptions.OAuth2;

        var formValues = new List<KeyValuePair<string, string>>
        {
            new("grant_type", "refresh_token"),
            new("client_id", oauthOptions.ClientId),
            new("client_secret", oauthOptions.ClientSecret),
            new("refresh_token", oauthOptions.RefreshToken)
        };

        if (!string.IsNullOrWhiteSpace(oauthOptions.Scope))
        {
            formValues.Add(new KeyValuePair<string, string>("scope", oauthOptions.Scope));
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, oauthOptions.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(formValues)
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to acquire OAuth2 access token. Status: {StatusCode}. Body: {Body}", response.StatusCode, payload);
            throw new InvalidOperationException("Failed to acquire OAuth2 access token for SMTP authentication.");
        }

        var tokenResponse = JsonSerializer.Deserialize<OAuth2TokenResponse>(payload, JsonOptions)
            ?? throw new InvalidOperationException("OAuth2 token response could not be parsed.");

        if (string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("OAuth2 token response did not contain an access token.");
        }

        return tokenResponse.AccessToken;
    }

    private sealed record OAuth2TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken);
}
