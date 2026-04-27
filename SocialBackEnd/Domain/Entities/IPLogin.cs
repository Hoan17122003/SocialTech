using System;

namespace SocialBackEnd.Domain.Entities;

public class IPLogin : EntityBase
{
    public string RefreshToken { set; get; }
    public string IpAddress { set; get; }
    public int UserId { set; get; }
    public User UserLogin { set; get; } = null;
}
