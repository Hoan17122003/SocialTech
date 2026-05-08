using SocialBackEnd.Common.DTOs.Ai;

namespace SocialBackEnd.Application.Ports.Inbound.web;

public interface IGeminiPort
{
    Task<GeminiGenerateResponse> GenerateAsync(
        GeminiGenerateRequest request,
        CancellationToken cancellationToken = default);
}
