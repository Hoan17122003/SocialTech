namespace SocialBackEnd.Common.Events;

public sealed record WelcomeEmailRequestedIntegrationEvent(
    string Email,
    string Username,
    string VerifyLink);
