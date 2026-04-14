using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Application.Notifications.Templates;

public sealed class WellcomeEmailRenderer : IEmailTemplateRenderer<WelcomeEmailModel>
{
    public string RenderSubject(WelcomeEmailModel model)
        => $"Welcome to SocialTech, {model.Username}!";

    public string RenderHtmlBody(WelcomeEmailModel model)
        => $"""
           <h1>Welcome, {model.Username}</h1>
           <p>Please verify your account:</p>
           <a href="{model.VerifyLink}">Verify account</a>
           """;

    public string RenderTextBody(WelcomeEmailModel model)
      => $"Welcome, {model.Username}. Verify your account here: {model.VerifyLink}";

}
