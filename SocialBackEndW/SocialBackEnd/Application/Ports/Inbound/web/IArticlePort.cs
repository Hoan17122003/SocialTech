using System;
using SocialBackEnd.Application.Ports.Outbound.Minio;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.Ai;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.DTOs.Comment;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.Article;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IArticlePort
{
    public Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId);
    public Task<ArticleDetailModelView> GetDetailArticle(int articleId, int userId);
    public Task<List<ArticleDetailModelView>> GetArticles(Paganation paganation, int userId, CancellationToken cancellationToken = default);
    public Task<CommentView> CreateCommentOfArticle(int articleId, RequestCreateComment requestCreateComment, int userId);
    public Task<CommentView> UpdateCommentOfArticle(int commentId, RequestUpdateComment requestUpdateComment, int userId);
    public Task<bool> DeleteCommentOfArticle(int commentId, int userId);
    public Task<List<CommentOfArticleModelView>> GetCommentsOfArticle(int articleId, int userId, Paganation paganation);
    public Task<(int, string)> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId);
    public Task<bool> DeleteArticle(int articleId, int userId);

}
