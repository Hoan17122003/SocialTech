using System;
using SocialBackEnd.Common.DTOs.Article;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IArticlePort
{
    public Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId);
    public Task<bool> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId);
    public Task<bool> DeleteArticle(int articleId, int userId);

}
