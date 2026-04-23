using System;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IArticlePort
{
    public Task<int> CreateArticle();
    public Task<bool> UpdateArticle();
    public Task<bool> DeleteArticle();

}
