using System;
using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Application.Notifications.Templates;

public class ForgetPasswordEmailRenderer : IEmailTemplateRenderer<ForgetPasswordEmailModel>
{
    public string RenderSubject(ForgetPasswordEmailModel model)
        => $"Reset your password, {model.Username}";

    public string RenderHtmlBody(ForgetPasswordEmailModel model)
        => $"""
           <h1>Hi, {model.Username}</h1>
           <p>You requested to reset your password. Click the link below to reset it:</p>
           <a href="{model.ResetPasswordLink}">Reset Password</a>
           """;

    public string RenderTextBody(ForgetPasswordEmailModel model)
        => $"Hi, {model.Username}. You requested to reset your password. Reset it here: {model.ResetPasswordLink}";
}
