namespace SocialBackEnd.Common.DTOs.Mail;

public record NotificationArticleCreate
{
    public string Title;
    public string SubContent;
    public string Thumbnail;
    public string LinkArticle;
    public string LinkProfileAuthor;
    public string NameAuthor;
    public string AvatarAuthor;
    public DateTime CreateDate;
}
