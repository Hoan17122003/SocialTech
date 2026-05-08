namespace SocialBackEnd.Common.DTOs.IpLogin;

public record class RequestIpLogin
{
    public int UserId { set; get; }
    public string IpAddress { set; get; }
    public string RefreshToken { set; get; }
}
