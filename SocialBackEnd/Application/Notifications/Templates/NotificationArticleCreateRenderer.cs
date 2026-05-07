using System.Globalization;
using System.Text.Encodings.Web;
using SocialBackEnd.Common.DTOs.Mail;

namespace SocialBackEnd.Application.Notifications.Templates;

public sealed class NotificationArticleCreateRenderer : IEmailTemplateRenderer<NotificationArticleCreate>
{
    public string RenderSubject(NotificationArticleCreate model)
        => model.Title;

    public string RenderHtmlBody(NotificationArticleCreate model)
    {
        var title = Html(model.Title);
        var authorName = Html(model.NameAuthor);
        var subContent = Html(model.SubContent);
        var articleUrl = Html(model.LinkArticle);
        var createdDate = model.CreateDate.ToString("MMM d, yyyy", CultureInfo.InvariantCulture);
        var avatarUrl = GetAbsoluteImageUrl(model.AvatarAuthor);
        var thumbnailUrl = GetAbsoluteImageUrl(model.Thumbnail);

        var avatarHtml = string.IsNullOrWhiteSpace(avatarUrl)
            ? InitialAvatar(model.NameAuthor)
            : $"""
              <img src="{Html(avatarUrl)}" alt="{authorName}" width="28" height="28" style="display:block;border-radius:50%;object-fit:cover;border:0;" />
              """;

        var thumbnailHtml = string.IsNullOrWhiteSpace(thumbnailUrl)
            ? string.Empty
            : $"""
              <tr>
                  <td style="padding:16px 12px 0 12px;">
                      <a href="{articleUrl}" style="text-decoration:none;">
                          <img src="{Html(thumbnailUrl)}" alt="{title}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
                      </a>
                  </td>
              </tr>
              """;

        return $"""
               <!doctype html>
               <html>
               <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#242424;">
                   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
                       <tr>
                           <td align="center" style="padding:0 16px;">
                               <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
                                   <tr>
                                       <td style="padding:0 12px 14px 12px;">
                                           <h1 style="margin:0;color:#242424;font-size:28px;line-height:34px;font-weight:700;letter-spacing:0;">
                                               {title}
                                           </h1>
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding:0 12px 18px 12px;border-bottom:1px solid #e6e6e6;">
                                           <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                               <tr>
                                                   <td width="32" style="padding-right:8px;vertical-align:middle;">
                                                       {avatarHtml}
                                                   </td>
                                                   <td style="vertical-align:middle;font-size:13px;line-height:20px;color:#242424;">
                                                       <span style="text-decoration:underline;">{authorName}</span>
                                                       <span style="color:#6b6b6b;">&nbsp;&middot;&nbsp;{createdDate}&nbsp;&middot;&nbsp;5 min read&nbsp;</span>
                                                       <span style="color:#c48a00;">+</span>
                                                       <span style="color:#6b6b6b;">&nbsp;&middot;&nbsp;</span>
                                                       <a href="{articleUrl}" style="color:#242424;text-decoration:underline;">View article</a>
                                                   </td>
                                               </tr>
                                           </table>
                                       </td>
                                   </tr>
                                   {thumbnailHtml}
                                   <tr>
                                       <td style="padding:24px 12px 0 12px;">
                                           <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                               <tr>
                                                   <td style="border-left:2px solid #242424;padding-left:12px;color:#242424;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:24px;font-style:italic;">
                                                       {subContent}
                                                   </td>
                                               </tr>
                                           </table>
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding:24px 12px 8px 12px;">
                                           <a href="{articleUrl}" style="display:inline-block;background:#242424;color:#ffffff;text-decoration:none;border-radius:4px;padding:10px 16px;font-size:14px;line-height:18px;font-weight:700;">
                                               Read full article
                                           </a>
                                       </td>
                                   </tr>
                               </table>
                           </td>
                       </tr>
                   </table>
               </body>
               </html>
               """;
    }

    public string RenderTextBody(NotificationArticleCreate model)
        => $"""
           {model.Title}

           By {model.NameAuthor} - {model.CreateDate:MMM d, yyyy}

           {model.SubContent}

           Read full article: {model.LinkArticle}
           """;

    private static string Html(string? value)
        => HtmlEncoder.Default.Encode(value ?? string.Empty);

    private static string GetAbsoluteImageUrl(string? value)
    {
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return uri.ToString();
        }

        return string.Empty;
    }

    private static string InitialAvatar(string authorName)
    {
        var initial = string.IsNullOrWhiteSpace(authorName)
            ? "A"
            : authorName.Trim()[0].ToString().ToUpperInvariant();

        return $"""
               <div style="width:28px;height:28px;border-radius:50%;background:#f2f2f2;color:#242424;text-align:center;line-height:28px;font-size:13px;font-weight:700;">
                   {Html(initial)}
               </div>
               """;
    }
}
