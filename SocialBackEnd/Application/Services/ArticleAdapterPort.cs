using System;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Services;

public class ArticleAdapterPort : IArticlePort
{
    private readonly IPostRepository _repository;
    private readonly IEntityMediaStorageService _entityMediaStorageService;

    private readonly IAttachmentRepository _attachmentRepository;

    public ArticleAdapterPort(IPostRepository repository,
        IEntityMediaStorageService entityMediaStorageService,
        IAttachmentRepository attachmentRepository)
    {
        _repository = repository ?? throw new ArgumentException(nameof(repository));
        _entityMediaStorageService = entityMediaStorageService ?? throw new ArgumentException(nameof(entityMediaStorageService));
        _attachmentRepository = attachmentRepository ?? throw new ArgumentException(nameof(attachmentRepository));
    }
    public async Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId)
    {
        var article = new Post
        {
            Title = requestCreateArticle.Title,
            Body = requestCreateArticle.Content,
            AuthorId = userId,
            CommunityId = requestCreateArticle.ComunityId
        };
        var articleId = await _repository.CreatePostAsync(article);

        List<Attachments>? fileUploadUrls = new List<Attachments>();
        if (requestCreateArticle.FileUploads is not null && requestCreateArticle.FileUploads.Count > 0)
        {
            var fileUrl = await _entityMediaStorageService.SavePostAttachmentsAsync(articleId, requestCreateArticle.FileUploads);
            if (fileUrl is null || fileUrl.Count == 0)
            {
                throw new Exception("Lưu tệp đính kèm thất bại.");
            }

            foreach (var file in fileUrl)
            {
                fileUploadUrls.Add(new Attachments
                {
                    FilePath = file.FilePath,
                    FileName = file.FileName,
                    FileExtension = file.FileExtension,
                    FileSize = file.FileSize,
                    PostId = articleId
                });
            }
            var attachmentCount = await _attachmentRepository.AddAttachmentsAsync(fileUploadUrls) == requestCreateArticle.FileUploads.Count ? true : false;
            if (attachmentCount)
            {
                
                throw new ConflicException("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
            }
        }

        return articleId;
    }

    public Task<bool> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId)
    {
        return Task.FromResult(true);
    }
    public Task<bool> DeleteArticle(int articleId, int userId)
    {
        return Task.FromResult(false);
    }
}
