using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IPostMediaAssetRepository : IRepository<PostMediaAsset>
{
    Task<List<PostMediaAsset>> GetByPostAsync(int postId, CancellationToken cancellationToken = default);
}
