using SocialBackend.Domain.Entities;
using SocialBackEnd.Common.Enum;

namespace SocialBackEnd.Domain.Entities
{
    public class ReactType : EntityBase
    {
        public ReactTypeEnums Type { get; set; }
        public ICollection<Reactions>? Reactions { get; set; }= new List<Reactions>();
    }
}
