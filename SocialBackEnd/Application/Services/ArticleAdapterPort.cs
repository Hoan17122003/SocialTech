using System;
using SocialBackEnd.Application.Ports.Inbound;

namespace SocialBackEnd.Application.Services;

public class ArticleAdapterPort : IArticlePort
{
    public async Task<int> CreateArticle()
    {
        return 1;
    }
    public Task<bool> UpdateArticle()
    {
        return Task.FromResult(true);
    }
    public Task<bool> DeleteArticle()
    {
        return Task.FromResult(false);
    }
}
