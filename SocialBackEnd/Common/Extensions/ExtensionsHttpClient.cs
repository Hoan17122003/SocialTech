using Azure;

namespace SocialBackEnd.Common.Extensions;

public class ExtensionsHttpClient
{

    private readonly Logger<ExtensionsHttpClient> _logger;

    public ExtensionsHttpClient(Logger<ExtensionsHttpClient> logger)
    {
        _logger = logger;
    }

    public static async Task<T> SendWithRetryAsync<T>(
        Func<Task<T>> action,
        int maxRetries = 3,
        int delayMilliseconds = 1000
    )
    {
        ArgumentNullException.ThrowIfNull(action);
        var response = default(T);
        int retryCount = 0;
        do
        {
            try
            {
                return await action();
            }
            catch (Exception ex)
            {
                retryCount++;
                if (retryCount > maxRetries)
                {
                    throw;
                }

                // Log the exception and retry
                Console.WriteLine($"Attempt {retryCount} failed: {ex.Message}. Retrying in {delayMilliseconds}ms...");
                await Task.Delay(delayMilliseconds);
            }
        } while (retryCount <= maxRetries);

        return  response ;
    }
}
