namespace SocialBackEnd.Common.Models;

public sealed class ApiResponse<T>
{
    private static readonly TimeZoneInfo VietnamTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

    public bool Success { get; init; }

    public string Message { get; init; } = string.Empty;

    public T? Data { get; init; }

    public DateTime ResponseTime { get; init; }

    public IEnumerable<string> Errors { get; init; } = Array.Empty<string>();

    public static ApiResponse<T> Ok(T data, string message = "Success")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            ResponseTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone)
        };
    }

    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            ResponseTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone),
            Errors = errors ?? Array.Empty<string>()
        };
    }
}
