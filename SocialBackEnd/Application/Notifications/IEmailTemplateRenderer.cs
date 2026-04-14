using System;

namespace SocialBackEnd.Application.Notifications;

public interface IEmailTemplateRenderer<in TModel>
{
    string RenderSubject(TModel model);
    string RenderHtmlBody(TModel model);
    string? RenderTextBody(TModel model) => null;
}
