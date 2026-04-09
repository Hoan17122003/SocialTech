using System;

namespace SocialBackEnd.Common.DTOs;

public class ResponseObject<T> where T : class
{
    public Boolean Success { get; set; }
    public String Message { get; set; }
    public T Data { get; set; }
}
