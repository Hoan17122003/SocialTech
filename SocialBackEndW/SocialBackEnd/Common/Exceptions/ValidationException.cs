namespace SocialBackEnd.Common.Exceptions;

public sealed class ValidationException : AppException
{
    public ValidationException(string message, IEnumerable<string>? errors = null)
        : base(message)
    {
        Errors = errors?.ToArray() ?? Array.Empty<string>();
    }

    public IReadOnlyCollection<string> Errors { get; }
}
