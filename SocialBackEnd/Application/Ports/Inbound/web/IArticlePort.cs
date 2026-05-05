using System;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.Models;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IArticlePort
{
    public Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId);
    public Task<(int, string)> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId);
    public Task<bool> DeleteArticle(int articleId, int userId);

}
