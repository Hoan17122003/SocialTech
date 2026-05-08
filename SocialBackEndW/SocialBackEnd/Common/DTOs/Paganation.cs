using System;

namespace SocialBackEnd.Common.DTOs;

public record Paganation
{
    public int Page { set; get; }
    public int Limit { set; get; }

}
