using System.ComponentModel.DataAnnotations;

namespace SocialBackEnd.Common.Extensions;

public class ExtensionsHttpClient
{
    public static async Task<T> SendWithRetryAsync<T>(
        string url,
        int maxRetries = 3,
        int delayMilliseconds = 1000
    )
    {
        int retryCount = 0;
        while (true)
        {
            try
            {
                var request = new HttpClient();
                var payload = new Object
                {
                    header
                };
                // Perform the HTTP request here
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