using SocialBackEnd.Common.DTOs.Ai;

namespace SocialBackEnd.Application.Ports.Outbound;

public interface IGeminiClientRouter
{
    Task<GeminiGenerateResponse> GenerateAsync(
        GeminiGenerateRequest request,
        CancellationToken cancellationToken = default);
}
