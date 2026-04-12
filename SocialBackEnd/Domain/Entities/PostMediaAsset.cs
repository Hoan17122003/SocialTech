using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Domain.Entities;

public class PostMediaAsset : EntityBase
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public MediaAssetType AssetType { get; set; } = MediaAssetType.Image;
    public string StorageUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Caption { get; set; }
    public int DisplayOrder { get; set; }
}
