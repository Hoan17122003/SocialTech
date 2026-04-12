using System;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Common.DTOs;

namespace SocialBackEnd.Application.Services;

public class ArticleServiceImpl : IArticleService
{   
    public int createArticle(RequestCreateArticleDTO requestCreateArticleDTO)
    {
        ArgumentNullException.ThrowIfNull(requestCreateArticleDTO);
        return 0;
    }

    public ArticleDTO getArticleById(int id)
    {
        return new ArticleDTO
        {
            Id = id,
            Title = "Article placeholder",
            Content = "Article service chua duoc implement.",
            Author = "System"
        };
    }
}
