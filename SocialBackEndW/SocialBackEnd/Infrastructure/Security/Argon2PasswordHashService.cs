using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using SocialBackEnd.Application.Ports.Outbound.Security;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Infrastructure.Security;

public sealed class Argon2PasswordHashService : IPasswordHashService
{
    private const string Prefix = "$argon2id$";
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 4;
    private const int MemorySizeKb = 65536;
    private const int DegreeOfParallelism = 2;

    private readonly IPasswordHasher<User> _legacyPasswordHasher;

    public Argon2PasswordHashService(IPasswordHasher<User> legacyPasswordHasher)
    {
        _legacyPasswordHasher = legacyPasswordHasher;
    }

    public string HashPassword(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Hash(password, salt, Iterations, MemorySizeKb, DegreeOfParallelism, HashSize);

        return string.Join(
            '$',
            Prefix.TrimEnd('$'),
            $"m={MemorySizeKb},t={Iterations},p={DegreeOfParallelism}",
            Convert.ToBase64String(salt),
            Convert.ToBase64String(hash));
    }

    public bool VerifyPassword(string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword) || string.IsNullOrWhiteSpace(providedPassword))
        {
            return false;
        }

        if (hashedPassword.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return VerifyArgon2Hash(hashedPassword, providedPassword);
        }

        try
        {
            var verificationResult = _legacyPasswordHasher.VerifyHashedPassword(
                new User(),
                hashedPassword,
                providedPassword);

            if (verificationResult is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded)
            {
                return true;
            }
        }
        catch (FormatException)
        {
        }

        return hashedPassword == providedPassword;
    }

    private static bool VerifyArgon2Hash(string hashedPassword, string providedPassword)
    {
        var parts = hashedPassword.Split('$', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 4 || !string.Equals(parts[0], "argon2id", StringComparison.Ordinal))
        {
            return false;
        }

        var parameters = ParseParameters(parts[1]);
        var salt = Convert.FromBase64String(parts[2]);
        var expectedHash = Convert.FromBase64String(parts[3]);

        var actualHash = Hash(
            providedPassword,
            salt,
            parameters.Iterations,
            parameters.MemorySizeKb,
            parameters.DegreeOfParallelism,
            expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    private static (int MemorySizeKb, int Iterations, int DegreeOfParallelism) ParseParameters(string parameterSection)
    {
        var sections = parameterSection.Split(',', StringSplitOptions.RemoveEmptyEntries);

        var memory = MemorySizeKb;
        var iterations = Iterations;
        var parallelism = DegreeOfParallelism;

        foreach (var section in sections)
        {
            var kv = section.Split('=', 2, StringSplitOptions.RemoveEmptyEntries);
            if (kv.Length != 2)
            {
                continue;
            }

            switch (kv[0])
            {
                case "m":
                    memory = int.Parse(kv[1]);
                    break;
                case "t":
                    iterations = int.Parse(kv[1]);
                    break;
                case "p":
                    parallelism = int.Parse(kv[1]);
                    break;
            }
        }

        return (memory, iterations, parallelism);
    }

    private static byte[] Hash(
        string password,
        byte[] salt,
        int iterations,
        int memorySizeKb,
        int degreeOfParallelism,
        int hashSize)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            Iterations = iterations,
            MemorySize = memorySizeKb,
            DegreeOfParallelism = degreeOfParallelism
        };

        return argon2.GetBytes(hashSize);
    }
}
