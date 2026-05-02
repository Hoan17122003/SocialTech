namespace SocialBackEnd.Common.Events;

public sealed record ForgetPasswordEmailRequestedIntegrationEvent(
    string Email,
    string Username,
    string ResetPasswordLink);
