import { PaganationRequest } from '@/common/contract/CommonContract';
import type { ApiResponse } from '@/common/types/api';

export type ArticleStatus = 'Draft' | 'Published' | 'Archived';

export type CreateArticleRequest = {
    title: string;
    content?: string;
    attachments?: File[];
    comunityId?: number;
    articleStatus?: ArticleStatus;
};

export type UpdateArticleRequest = {
    title?: string;
    content?: string;
    attachments?: File[];
    communityId?: number;
    status?: ArticleStatus;
};

export type ArticleDetail = {
    title: string;
    content: string;
    attachments: string[];
    isPermissionEdit: boolean;
    createDate: string;
    nameAuthor: string;
    publicIdAuthor: string;
    avatarAuthor: string;
};

export type BasicArticle = ArticleDetail & {
    id: number
};

export type RequestGetNewsPaper = {
    limit: number;
    page: number;
};

export type CommentAuthorModelView = {
    authorPublicId?: number;
    nameAuthor: string;
    avatarAuthor: string;
};

export type CommentOfArticleModelView = {
    id?: number | string;
    authorOfComment: CommentAuthorModelView;
    content: string;
    attachments: string[];
    isPermissionEdit: boolean;
    createDate: string;
};

export type CommentView = {
    id: number;
    authorPublicId: CommentAuthorModelView;
    content: string;
    attachments: string[];
    createdAtUtc: string;
};

export type RealtimeCommentPayload = {
    id: number;
    postId: number;
    authorId: number;
    authorDisplayName: string;
    authorAvatarUrl: string;
    body: string;
    attachments?: string[];
    createdAtUtc: string;
    isPermissionEdit?: boolean;
};

export type RequestWriteComment = {
    body: string;
    status?: number;
    depth?: number;
    parentCommentId?: number | null;
    attachments?: File[];
};

export type RequestGetComments = PaganationRequest & {
    articleId: number;
};

export type ResponseGetNewsPaper = ApiResponse<BasicArticle[]>;

export type ArticleDetailResponse = ApiResponse<ArticleDetail>;

export type CommentsOfArticleResponse = ApiResponse<CommentOfArticleModelView[]>;

export type ReactArticleRequest = {
    ID: number;
    React: string;
};

