using System;

namespace SocialBackEnd.Common.Exceptions;

public sealed class ConflicException : AppException
{
    public ConflicException(string message) : base(message)
    {

    }
}
