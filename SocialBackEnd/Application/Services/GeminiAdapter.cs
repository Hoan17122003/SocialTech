using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.Exceptions;

namespace SocialBackEnd.Application.Services;

public sealed class GeminiAdapter : IGeminiPort
{
    private readonly IGeminiClientRouter _geminiClientRouter;

    public GeminiAdapter(IGeminiClientRouter geminiClientRouter)
    {
        _geminiClientRouter = geminiClientRouter ?? throw new ArgumentNullException(nameof(geminiClientRouter));
    }

    public Task<GeminiGenerateResponse> GenerateAsync(
        GeminiGenerateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            throw new AppException("Prompt is required.");
        }

        return _geminiClientRouter.GenerateAsync(request, cancellationToken);
    }
}
