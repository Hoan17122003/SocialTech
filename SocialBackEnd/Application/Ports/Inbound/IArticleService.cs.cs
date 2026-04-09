using System;
using SocialBackEnd.Common.DTOs;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IArticleService
{
    public int createArticle(RequestCreateArticleDTO requestCreateArticleDTO);

    public ArticleDTO getArticleById(int id);
    
}
