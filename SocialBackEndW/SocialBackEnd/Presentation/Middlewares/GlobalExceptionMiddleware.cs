using System.Net;
using System.Text.Json;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Presentation.Middlewares;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            LogException(exception);
            await HandleExceptionAsync(context, exception);
        }
    }

    private void LogException(Exception exception)
    {
        switch (exception)
        {
            case ValidationException:
            case NotFoundException:
            case ConflicException:
            case AppException:
            case ArgumentException:
            case UnauthorizedAccessException:
                _logger.LogWarning("Handled exception: {ExceptionType} - {Message}", exception.GetType().Name, exception.Message);
                break;
            default:
                _logger.LogError(exception, "Unhandled exception");
                break;
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            ValidationException validationException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(validationException.Message, validationException.Errors)),
            NotFoundException notFoundException => (
                HttpStatusCode.NotFound,
                ApiResponse<object>.Fail(notFoundException.Message)),
            ConflicException conflicException => (
                HttpStatusCode.Conflict,
                ApiResponse<object>.Fail(conflicException.Message)),
            UnauthorizedAccessException unauthorizedAccessException => (
                HttpStatusCode.Forbidden,
                ApiResponse<object>.Fail(unauthorizedAccessException.Message)),
            ArgumentException argumentException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(argumentException.Message)),
            AppException appException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(appException.Message)),
            _ => (
                HttpStatusCode.InternalServerError,
                ApiResponse<object>.Fail("An unexpected error occurred."))
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonSerializerOptions));
    }
}
