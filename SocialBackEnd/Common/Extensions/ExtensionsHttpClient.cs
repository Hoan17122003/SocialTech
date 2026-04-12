namespace SocialBackEnd.Common.Extensions;

public class ExtensionsHttpClient
{
    public static async Task<T> SendWithRetryAsync<T>(
        Func<Task<T>> action,
        int maxRetries = 3,
        int delayMilliseconds = 1000
    )
    {
        ArgumentNullException.ThrowIfNull(action);

        int retryCount = 0;
        while (true)
        {
            try
            {
                return await action();
            }
            catch (Exception ex) when (retryCount < maxRetries)
            {
                retryCount++;
                Console.WriteLine($"Attempt {retryCount} failed: {ex.Message}. Retrying in {delayMilliseconds}ms...");
                await Task.Delay(delayMilliseconds);
            }
        }
    }
}
