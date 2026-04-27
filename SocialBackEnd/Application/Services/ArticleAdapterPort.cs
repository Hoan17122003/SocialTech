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
    private readonly ILogger _logger;

    public ArticleAdapterPort(IPostRepository repository,
        IEntityMediaStorageService entityMediaStorageService,
        IAttachmentRepository attachmentRepository,
        ILogger<ArticleAdapterPort> logger)
    {
        _repository = repository ?? throw new ArgumentException(nameof(repository));
        _entityMediaStorageService = entityMediaStorageService ?? throw new ArgumentException(nameof(entityMediaStorageService));
        _attachmentRepository = attachmentRepository ?? throw new ArgumentException(nameof(attachmentRepository));
        _logger = logger ?? throw new ArgumentException(nameof(logger));
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
        var articleEntity = await _repository.CreatePostAsync(article);

        List<Attachments>? fileUploadUrls = new List<Attachments>();
        if (requestCreateArticle.Attachments is not null && requestCreateArticle.Attachments.Count > 0)
        {
            var fileUrl = await _entityMediaStorageService.SavePostAttachmentsAsync(articleEntity.Id, requestCreateArticle.Attachments);
            if (fileUrl is null || fileUrl.Count == 0)
            {
                await _repository.RemoveAsync(articleEntity);
                _logger.LogError("Lưu tệp đính kèm thất bại, không thể lưu bài viết với id {ArticleId}", articleEntity.Id);
                throw new Exception("Tạo bài viết thất bại, không thể lưu tệp đính kèm.");
            }

            foreach (var file in fileUrl)
            {
                fileUploadUrls.Add(new Attachments
                {
                    FilePath = file.FilePath,
                    FileName = file.FileName,
                    FileExtension = file.FileExtension,
                    FileSize = file.FileSize,
                    PostId = articleEntity.Id
                });
            }
            var attachmentCount = await _attachmentRepository.AddAttachmentsAsync(fileUploadUrls) == requestCreateArticle.Attachments.Count ? true : false;
            if (!attachmentCount)
            {
                _logger.LogError("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
                throw new ConflicException("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
            }
        }

        return articleEntity.Id;
    }


    public async Task<bool> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId)
    {
        // var existingArticle = await _attachmentRepository.ExistsByPostIdAsync(articleId);
        // if (!existingArticle)
        // {
        //     throw new NotFoundException("Bài viết không tồn tại.");
        // }
        return true;
    }
    public async Task<bool> DeleteArticle(int articleId, int userId)
    {
        var existsArticle = await _repository.GetByIdAsync(articleId);
        if (existsArticle is null)
        {
            throw new NotFoundException("Bài viết không tồn tại.");
        }
        if (existsArticle.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bài viết này.");
        }
        return await _repository.RemoveAsync(existsArticle);
    }
}
