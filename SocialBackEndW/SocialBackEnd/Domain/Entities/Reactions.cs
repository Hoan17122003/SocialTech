
using SocialBackEnd.Common.Enum;
using SocialBackEnd.Domain.Entities;

namespace SocialBackend.Domain.Entities;

public class Reactions : EntityBase
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public ReactTypeEnums? ReactEnums { get; set; } = null!;
    public int ReactTypeId { get; set; }
    public ReactType React { get; set; }
}