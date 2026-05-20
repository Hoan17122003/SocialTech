using System;
using Minio.Exceptions;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Events;
using SocialBackEnd.Application.Ports.Outbound.LLM;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.Constants;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.Events;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models.Article;
using SocialBackEnd.Common.Models.Storage;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;

namespace SocialBackEnd.Application.Services;

public class ArticleAdapterPort : IArticlePort
{
    private readonly IPostRepository _repository;
    private readonly IEntityMediaStorageService _entityMediaStorageService;
    private readonly IAttachmentRepository _attachmentRepository;
    private readonly IApplicationEventPublisher _applicationEventPublisher;
    private readonly ILogger _logger;
    private readonly IGeminiArticlePort _geminiArticlePort;


    public ArticleAdapterPort(IPostRepository repository,
        IEntityMediaStorageService entityMediaStorageService,
        IAttachmentRepository attachmentRepository,
        IApplicationEventPublisher applicationEventPublisher,
        ILogger<ArticleAdapterPort> logger,
        IGeminiArticlePort geminiArticlePort)
    {
        _repository = repository ?? throw new ArgumentException(nameof(repository));
        _entityMediaStorageService = entityMediaStorageService ?? throw new ArgumentException(nameof(entityMediaStorageService));
        _attachmentRepository = attachmentRepository ?? throw new ArgumentException(nameof(attachmentRepository));
        _applicationEventPublisher = applicationEventPublisher ?? throw new ArgumentNullException(nameof(applicationEventPublisher));
        _logger = logger ?? throw new ArgumentException(nameof(logger));
        _geminiArticlePort = geminiArticlePort;
    }
    public async Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId)
    {
        var articleValidateParam = new ArticleValidateRequest
        {
            Title = requestCreateArticle.Title,
            Content = requestCreateArticle.Content,
            Attachments = requestCreateArticle.Attachments
        };
        var validateArticle = await _geminiArticlePort.ValidateArticle(articleValidateParam);
        if (!validateArticle)
        {
            _logger.LogInformation($"value of validate: {validateArticle}");
            return Constant.ResponseStatusArticle.BadParamOfArticle;
        }
        var article = new Post
        {
            Title = requestCreateArticle.Title,
            Body = requestCreateArticle.Content,
            AuthorId = userId,
            CommunityId = requestCreateArticle.ComunityId,
            Status = requestCreateArticle.ArticleStatus
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

            fileUploadUrls = BuildAttachmentEntities(articleEntity.Id, fileUrl);
            var attachmentCount = await _attachmentRepository.AddAttachmentsAsync(fileUploadUrls);
            if (attachmentCount != requestCreateArticle.Attachments.Count)
            {
                _logger.LogError("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
                throw new ConflicException("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
            }
        }
        // không nên bỏ toàn bộ vào phía PublisArticleCreatedAsync nên bỏ luôn await tại vì nó sẽ bị buộc phải chờ kết quả 
        var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);
        if (articleCreatedEvent is not null)
        {
            articleCreatedEvent.AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(articleCreatedEvent.AvatarAuthor);
            articleCreatedEvent.Thumbnail = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(articleCreatedEvent.Thumbnail);
            await _applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
        }
        return articleEntity.Id;
    }

    public async Task<ArticleDetailModelView?> GetDetailArticle(int articleId, int userId)
    {
        var article = await _repository.GetDetailArticleById(articleId, userId);

        if (article is null)
        {
            throw new NotFoundException($"Bài viết không tồn tại.");
        }
        
        var result = new ArticleDetailModelView
        {
            Title = article.Title,
            Content = article.Body ?? string.Empty,
            Attachments = article.Attachments
                .Select(attachment => _entityMediaStorageService.GetAbsolutePathImageEcomsystem(attachment.FilePath))
                .ToList(),
            IsPermissionEdit = article.AuthorId == userId,
            CreateDate = article.CreatedAtUtc,
            NameAuthor = article.Author.DisplayName,
            AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(article.Author.ProfileImageUrl) ?? string.Empty
        };
        return result;
    }


    public async Task<(int, string)> UpdateArticle(RequestUpdateArticle requestUpdateArticle, int articleId, int userId)
    {
        var existingArticle = await _repository.GetByIdAsync(articleId);
        if (existingArticle is null)
        {
            throw new NotFoundException("Bài viết không tồn tại.");
        }

        if (existingArticle.AuthorId != userId)
        {
            return (Constant.ResponseStatusArticle.ForbidenOfArticle, Constant.ResponseStatusArticle.ForbidenMessage);
        }

        var articleValidateParam = new ArticleValidateRequest
        {
            Title = requestUpdateArticle.Title ?? existingArticle.Title,
            Content = requestUpdateArticle.Content ?? existingArticle.Body,
            Attachments = requestUpdateArticle.Attachments
        };

        var validateContentOfArticle = await _geminiArticlePort.ValidateArticle(articleValidateParam);

        if (!validateContentOfArticle)
        {
            return (Constant.ResponseStatusArticle.BadParamOfArticle, Constant.ResponseStatusArticle.BadParamMesssage);
        }
        existingArticle.Title = requestUpdateArticle.Title ?? existingArticle.Title;
        existingArticle.Body = requestUpdateArticle.Content ?? existingArticle.Body;
        existingArticle.CommunityId = requestUpdateArticle.CommunityId ?? existingArticle.CommunityId;
        existingArticle.Status = requestUpdateArticle.Status ?? existingArticle.Status;
        existingArticle.UpdatedAtUtc = DateTime.UtcNow;

        var updateResult = await _repository.UpdateArticleAsync(existingArticle);

        if (!updateResult)
        {
            return (Constant.ResponseStatusArticle.BadParamOfArticle, Constant.ResponseStatusArticle.BadParamMesssage);
        }

        if (requestUpdateArticle.Attachments is not null)
        {
            var currentAttachments = await _attachmentRepository.GetAttachmentsByPostIdAsync(articleId);
            var existingAttachments = currentAttachments
                .Where(attachment => _entityMediaStorageService.FileExists(attachment.FilePath))
                .ToList();

            var missingFileAttachments = currentAttachments
                .Where(attachment => !_entityMediaStorageService.FileExists(attachment.FilePath))
                .ToList();

            var requestedFileNames = requestUpdateArticle.Attachments
                .Where(file => file.Length > 0)
                .Select(file => Path.GetFileName(file.FileName))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var attachmentsToDelete = existingAttachments
                .Where(attachment => !requestedFileNames.Contains(attachment.FileName))
                .ToList();

            attachmentsToDelete.AddRange(missingFileAttachments);

            if (attachmentsToDelete.Count > 0)
            {
                foreach (var attachment in attachmentsToDelete)
                {
                    _attachmentRepository.Remove(attachment);
                }

                await _attachmentRepository.SaveChangesAsync();
                await _entityMediaStorageService.DeleteFilesAsync(attachmentsToDelete.Select(x => x.FilePath));
            }

            var currentFileNames = existingAttachments
                .Select(attachment => attachment.FileName)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var attachmentsToSave = requestUpdateArticle.Attachments
                .Where(file => file.Length > 0)
                .Where(file => !currentFileNames.Contains(Path.GetFileName(file.FileName)))
                .ToList();

            if (attachmentsToSave.Count > 0)
            {
                var storedFiles = await _entityMediaStorageService.SavePostAttachmentsAsync(
                    articleId,
                    attachmentsToSave);

                var attachmentEntities = BuildAttachmentEntities(articleId, storedFiles);
                var attachmentCount = await _attachmentRepository.AddAttachmentsAsync(attachmentEntities);
                if (attachmentCount != attachmentsToSave.Count)
                {
                    _logger.LogError("Lưu tệp đính kèm thất bại, số lượng tệp lưu không khớp với số lượng tệp tải lên.");
                    throw new ConflicException("Lưu tệp đính kèm thất bại, số lượng tệp lưu không khớp với số lượng tệp tải lên.");
                }
            }
        }
        return (Constant.ResponseStatusArticle.SuccessActionOfArticle, Constant.ResponseStatusArticle.SuccessActionMessage);
    }

    private Task<PostStatus> StatusOfArticle(PostStatus postStatusParam, int posStatusEntity)
    {
        //Todo : implement logic StatusOfArticle if current status is RemovedBymoderator then not update case, RemovedByModerator -> Publicshed 

        return null;
    }

    public async Task<bool> DeleteArticle(int articleId, int userId)
    {
        var existsArticle = await _repository.GetDetailArticleById(articleId, userId);
        if (existsArticle is null)
        {
            throw new NotFoundException("Bài viết không tồn tại.");
        }
        if (existsArticle.AuthorId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xoá bài viết này");
        }
        if (existsArticle.Attachments.Count > 0)
        {
            var deleteAttachments = await _attachmentRepository.GetAttachmentsByPostIdAsync(articleId);
            await _entityMediaStorageService.DeleteFilesAsync(deleteAttachments.Select(x => x.FilePath));
        }
        return await _repository.RemoveAsync(existsArticle);
    }

    private static List<Attachments> BuildAttachmentEntities(
        int postId,
        IReadOnlyList<StoredMediaFile> storedFiles)
    {
        return storedFiles
            .Select(file => new Attachments
            {
                FilePath = file.FilePath,
                FileName = file.FileName,
                FileExtension = file.FileExtension,
                FileSize = file.FileSize,
                PostId = postId
            })
            .ToList();
    }

}
