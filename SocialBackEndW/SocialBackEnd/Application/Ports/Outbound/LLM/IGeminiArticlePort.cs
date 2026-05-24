using System;
using SocialBackEnd.Application.Ports.Inbound.web;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.DTOs.Article;

namespace SocialBackEnd.Application.Ports.Outbound.LLM;

public interface IGeminiArticlePort : IGeminiPort
{
    Task<bool> ValidateArticle(ArticleValidateRequest requestCreateArticle);
    Task<bool> ValidateComment(string comment);
}
