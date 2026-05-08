namespace SocialBackEnd.Application.Ports.Outbound.Security;

public interface IPasswordHashService
{
    string HashPassword(string password);
    bool VerifyPassword(string hashedPassword, string providedPassword);
}
