namespace SocialBackEnd.Common.DTOs.User;

public record class RequestGetFollowers
{
    public int? UserTargetId;
    public Paganation Paganation { set; get; }
}
