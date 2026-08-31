using System;
using Minio.Exceptions;
using SocialBackEnd.Application.Ports.Inbound;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Events;
using SocialBackEnd.Application.Ports.Outbound.LLM;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Common.Constants;
using Microsoft.AspNetCore.SignalR;
using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.Article;
using SocialBackEnd.Common.DTOs.Comment;
using SocialBackEnd.Common.Events;
using SocialBackEnd.Common.Exceptions;
using SocialBackEnd.Common.Models.Article;
using SocialBackEnd.Common.Models.Storage;
using SocialBackEnd.Domain.Entities;
using SocialBackEnd.Domain.Enums;
using SocialBackend.Common.Events;
using SocialBackEnd.Application.Ports.Outbound.UoW;
using System.Text.Json;

namespace SocialBackEnd.Application.Services;

public class ArticleAdapterPort : IArticlePort
{
    private readonly IPostRepository _repository;
    private readonly ICommentRepository _commentRepository;
    private readonly IEntityMediaStorageService _entityMediaStorageService;
    private readonly IEntityMediaLocalStorageService _entityMediaLocalStorageService;
    private readonly IAttachmentRepository _attachmentRepository;
    private readonly IApplicationEventPublisher _applicationEventPublisher;

    private readonly ILogger _logger;
    private readonly IGeminiArticlePort _geminiArticlePort;

    private readonly IUnitOfWork _unitOfWork;


    public ArticleAdapterPort(IPostRepository repository,
        ICommentRepository commentRepository,
        IEntityMediaStorageService entityMediaStorageService,
        IEntityMediaLocalStorageService entityMediaLocalStorageService,
        IAttachmentRepository attachmentRepository,
        IApplicationEventPublisher applicationEventPublisher,
        ILogger<ArticleAdapterPort> logger,
        IGeminiArticlePort geminiArticlePort,
        IUnitOfWork unitOfWork
    )
    {
        _repository = repository ?? throw new ArgumentException(nameof(repository));
        _commentRepository = commentRepository ?? throw new ArgumentException(nameof(commentRepository));
        _entityMediaStorageService = entityMediaStorageService ?? throw new ArgumentException(nameof(entityMediaStorageService));
        _attachmentRepository = attachmentRepository ?? throw new ArgumentException(nameof(attachmentRepository));
        _applicationEventPublisher = applicationEventPublisher ?? throw new ArgumentNullException(nameof(applicationEventPublisher));
        _logger = logger ?? throw new ArgumentException(nameof(logger));
        _geminiArticlePort = geminiArticlePort;
        _unitOfWork = unitOfWork ?? throw new ArgumentException(nameof(unitOfWork));
        _entityMediaLocalStorageService = entityMediaLocalStorageService ?? throw new ArgumentException(nameof(entityMediaLocalStorageService));
    }
    public async Task<int> CreateArticle(RequestCreateArticle requestCreateArticle, int userId)
    {
        var articleValidateParam = new ArticleValidateRequest
        {
            Title = requestCreateArticle.Title,
            Content = requestCreateArticle.Content,
            Attachments = requestCreateArticle.Attachments
        };

        //var validateArticle = await _geminiArticlePort.ValidateArticle(articleValidateParam);

        //if (!validateArticle)
        //{
        //    _logger.LogInformation($"value of validate: {validateArticle}");
        //    return Constant.ResponseStatusArticle.BadParamOfArticle;
        //}
        await _unitOfWork.BeginTransactionAsync();
        try
        {
            var articleEntity = new Post
            {
                Title = requestCreateArticle.Title,
                Body = requestCreateArticle.Content,
                AuthorId = userId,
                CommunityId = requestCreateArticle.ComunityId,
                Status = requestCreateArticle.ArticleStatus
            };

            await _unitOfWork.Articles.AddAsync(articleEntity);
            await _unitOfWork.SaveChangesAsync();

            List<Attachments>? fileUploadUrls = new List<Attachments>();
            if (requestCreateArticle.Attachments is not null && requestCreateArticle.Attachments.Count > 0)
            {
                var fileUrl = await _entityMediaLocalStorageService.SavePostAttachmentsAsync(articleEntity.Id, requestCreateArticle.Attachments);
                if (fileUrl.Count != requestCreateArticle.Attachments.Count)
                {
                    throw new ConflicException("somefiles lost of the phase handle");
                }
                fileUploadUrls = BuildAttachmentEntities(articleEntity.Id, fileUrl);
                await _unitOfWork.Attachment.AddRangeAsync(fileUploadUrls);
                var outBoxMessages = fileUploadUrls.Select(x => new OutBoxMessage
                {
                    AggregateId = articleEntity.Id,
                    //AggregateType = nameof(Post),
                    AggregateType = "social_service.SocialTechDatabase.OutBoxMessages",
                    EventType = "ArticleCreated",
                    Payload = JsonSerializer.Serialize(fileUploadUrls)

                }).ToList();

                await _unitOfWork.OutBoxMessages.AddRangeAsync(outBoxMessages);
            }
            await _unitOfWork.SaveChangesAsync();
            await _unitOfWork.CommitAsync();
            // không nên bỏ toàn bộ vào phía PublisArticleCreatedAsync nên bỏ luôn await tại vì nó sẽ bị buộc phải chờ kết quả 
            // var articleCreatedEvent = await _repository.GetArticleCreatedEventAsync(articleEntity.Id);
            // if (articleCreatedEvent is not null)
            // {
            //     articleCreatedEvent.AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(articleCreatedEvent.AvatarAuthor);
            //     articleCreatedEvent.Thumbnail = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(articleCreatedEvent.Thumbnail);
            //     await _applicationEventPublisher.PublishArticleCreatedAsync(articleCreatedEvent);
            // }
            return articleEntity.Id;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync();
            throw;
        }
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
            PublicIdAuthor = article.Author.PublicId,
            AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(article.Author.ProfileImageUrl) ?? string.Empty
        };
        return result;
    }

    public async Task<List<ArticleDetailModelView>> GetArticles(Paganation paganation, int userId, CancellationToken cancellationToken = default)
    {
        var result = await _repository.GetArticlesAsync(paganation, cancellationToken);

        var news = result.Select(x => new ArticleDetailModelView
        {
            Id = x.Id,
            Title = x.Title,
            Content = x.Body ?? "",
            Attachments = x.Attachments.Select(attachment => _entityMediaStorageService.GetAbsolutePathImageEcomsystem(attachment.FilePath)).ToList(),
            IsPermissionEdit = userId == x.AuthorId,
            CreateDate = x.CreatedAtUtc,
            NameAuthor = x.Author.DisplayName,
            PublicIdAuthor = x.Author.PublicId,
            AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(x.Author.ProfileImageUrl) ?? string.Empty,
            CountComment = x.Comments.Count,
            CountReact = x.Reactions.Count

        }).ToList();
        return news;
    }

    public async Task<CommentView> CreateCommentOfArticle(int articleId, RequestCreateComment requestCreateComment, int userId)
    {
        var existingArticle = await _repository.GetByIdAsync(articleId);
        if (existingArticle is null)
        {
            throw new NotFoundException("Bài viết không tồn tại.");
        }
        if (requestCreateComment.Depth > 0 && requestCreateComment.ParentCommentId is null)
        {
            throw new ValidationException("Depth lớn hơn 0 nhưng ParentCommentId là null.");
        }
        else if (requestCreateComment.Depth == 0 && requestCreateComment.ParentCommentId is not null)
        {
            throw new ValidationException("Depth bằng 0 nhưng ParentCommentId không phải là null.");
        }

        var parrentComment = requestCreateComment.ParentCommentId is not null && requestCreateComment.Depth > 0
            ? await _commentRepository.GetByIdAsync(requestCreateComment.ParentCommentId.Value)
            : null;

        var validateContentOfComment = await _geminiArticlePort.ValidateComment(requestCreateComment.Body);

        if (!validateContentOfComment)
        {
            _logger.LogInformation($"value of validate comment: {validateContentOfComment}");
            throw new ForbiddenException("Nội dung bình luận không hợp lệ.");
        }

        var comment = new Comment
        {
            PostId = articleId,
            Body = requestCreateComment.Body,
            AuthorId = userId,
            ParentCommentId = requestCreateComment.ParentCommentId,
            Status = requestCreateComment.status,
            Depth = requestCreateComment.Depth
        };

        var commentSaved = await _commentRepository.CreateCommentOfArticleAsync(comment);
        List<Attachments>? fileUploadUrls = new List<Attachments>();
        if (requestCreateComment.Attachments is not null && requestCreateComment.Attachments.Count > 0)
        {
            var fileUrl = await _entityMediaStorageService.SavePostAttachmentsAsync(commentSaved.Id, requestCreateComment.Attachments);
            if (fileUrl is null || fileUrl.Count == 0)
            {
                await _commentRepository.DeleteCommentOfArticleAsync(commentSaved.Id);
                _logger.LogError("Lưu tệp đính kèm thất bại, không thể lưu bình luận với id {CommentId}", commentSaved.Id);
                throw new Exception("Tạo bình luận thất bại, không thể lưu tệp đính kèm.");
            }

            fileUploadUrls = BuildAttachmentEntities(commentSaved.Id, fileUrl);
            var attachmentCount = await _attachmentRepository.AddAttachmentsAsync(fileUploadUrls);
            if (attachmentCount != requestCreateComment.Attachments.Count)
            {
                _logger.LogError("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
                throw new ConflicException("Lưu tệp đính kèm thất bại, số lượng tệp đính kèm lưu không khớp với số lượng tệp đính kèm đã tải lên.");
            }
        }
        await _applicationEventPublisher.PublishCommentCreatedAsync(new CommentCreatedIntegrationEvent
        {
            CommentId = commentSaved.Id,
            CommentAuthorId = commentSaved.AuthorId,
            CommentAuthorDisplayName = commentSaved.Author.DisplayName,
            CommentAuthorAvatarUrl = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(commentSaved.Author.ProfileImageUrl) ?? string.Empty,
            CommentBody = commentSaved.Body,
            ParentCommentId = parrentComment?.Id,
            ParentCommentAuthorId = parrentComment?.AuthorId,
            ParentCommentAuthorDisplayName = parrentComment?.Author?.DisplayName,
            ArticleId = existingArticle.Id,
            ArticleAuthorId = existingArticle.AuthorId,
            ArticleAuthorDisplayName = existingArticle.Author?.DisplayName ?? string.Empty,
            CreateDate = DateTime.UtcNow
        });

        return new CommentView
        {
            Id = commentSaved.Id,
            AuthorPublicId = new CommentAuthorModelView
            {
                AuthorPublicId = commentSaved.AuthorId,
                NameAuthor = commentSaved.Author.DisplayName,
                AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(commentSaved.Author.ProfileImageUrl) ?? string.Empty
            },
            Content = commentSaved.Body ?? string.Empty,
            Attachments = commentSaved.Attachments
                .Select(attachment => _entityMediaStorageService.GetAbsolutePathImageEcomsystem(attachment.FilePath))
                .ToList(),
            CreatedAtUtc = commentSaved.CreatedAtUtc
        };

    }

    public async Task<CommentView> UpdateCommentOfArticle(int commentId, RequestUpdateComment requestUpdateComment, int userId)
    {
        var existingComment = await _commentRepository.GetCommentByIdAsync(commentId);
        if (existingComment is null)
        {
            throw new NotFoundException("Bình luận không tồn tại.");
        }

        if (existingComment.AuthorId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền sửa bình luận này");
        }

        var validateContentOfComment = await _geminiArticlePort.ValidateComment(requestUpdateComment.Body);

        if (!validateContentOfComment)
        {
            _logger.LogInformation($"value of validate comment: {validateContentOfComment}");
            throw new ForbiddenException("Nội dung bình luận không hợp lệ.");
        }

        existingComment.Body = requestUpdateComment.Body ?? existingComment.Body;
        existingComment.UpdatedAtUtc = DateTime.UtcNow;
        existingComment.Status = requestUpdateComment.Status ?? existingComment.Status;

        var updatedComment = await _commentRepository.UpdateCommentOfArticleAsync(existingComment);
        return new CommentView
        {
            Id = updatedComment.Id,
            AuthorPublicId = new CommentAuthorModelView
            {
                AuthorPublicId = updatedComment.AuthorId,
                NameAuthor = updatedComment.Author.DisplayName,
                AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(updatedComment.Author.ProfileImageUrl) ?? string.Empty
            },
            Content = updatedComment.Body ?? string.Empty,
            Attachments = updatedComment.Attachments
                .Select(attachment => _entityMediaStorageService.GetAbsolutePathImageEcomsystem(attachment.FilePath))
                .ToList(),
            CreatedAtUtc = updatedComment.CreatedAtUtc
        };
    }

    public async Task<bool> DeleteCommentOfArticle(int commentId, int userId)
    {
        var existingComment = await _commentRepository.GetCommentByIdAsync(commentId);
        if (existingComment is null)
        {
            throw new NotFoundException("Bình luận không tồn tại.");
        }

        if (existingComment.AuthorId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xoá bình luận này");
        }

        return await _commentRepository.DeleteCommentOfArticleAsync(commentId);
    }

    public async Task<List<CommentOfArticleModelView>> GetCommentsOfArticle(int articleId, int userId, Paganation paganation)
    {
        var comments = await _commentRepository.GetCommentsOfArticleAsync(articleId, paganation);

        return comments.Select(comment => new CommentOfArticleModelView
        {
            AuthorOfComment = new CommentAuthorModelView
            {
                NameAuthor = comment.Author.DisplayName,
                AvatarAuthor = _entityMediaStorageService.GetAbsolutePathImageEcomsystem(comment.Author.ProfileImageUrl) ?? string.Empty
            },
            Content = comment.Body ?? string.Empty,
            Attachments = comment.Attachments
                .Select(attachment => _entityMediaStorageService.GetAbsolutePathImageEcomsystem(attachment.FilePath))
                .ToList(),
            IsPermissionEdit = comment.AuthorId == userId,
            CreateDate = comment.CreatedAtUtc,
        }).ToList();
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
