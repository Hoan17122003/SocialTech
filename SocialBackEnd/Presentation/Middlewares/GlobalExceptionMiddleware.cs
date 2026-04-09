using System.Net;
using System.Text.Json;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Presentation.Middlewares;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

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
            _logger.LogError(exception, "Unhandled exception");
            await HandleExceptionAsync(context, exception);
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
            AppException appException => (
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(appException.Message)),
            _ => (
                HttpStatusCode.InternalServerError,
                ApiResponse<object>.Fail("An unexpected error occurred."))
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
