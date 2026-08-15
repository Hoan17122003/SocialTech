import { objectToFormData } from '@/common/utils/object-to-form-data';
import { httpClient } from '@/shared/api/http-client';
import {
    ResponseGetNewsPaper,
    type ArticleDetailResponse,
    type CreateArticleRequest,
    type UpdateArticleRequest,
    type RequestWriteComment,
    type CommentsOfArticleResponse,
    type CommentView,
} from './contracts';
import { toQueryString } from '@/common/utils/query-string';
import { PaganationRequest } from '@/common/contract/CommonContract';
import type { ApiResponse } from '@/common/types/api';

export const articlesApi = {
    create(payload: CreateArticleRequest) {
        return httpClient.post('/api/Article/create', objectToFormData(payload));
    },
    getDetail(articleId: number) {
        return httpClient.get<ArticleDetailResponse>(`/api/Article/detail/${articleId}`);
    },
    update(articleId: number, payload: UpdateArticleRequest) {
        return httpClient.put(`/api/Article/update/${articleId}`, objectToFormData(payload));
    },
    remove(articleId: number) {
        return httpClient.delete(`/api/Article/delete/${articleId}`);
    },
    news(requestGetNewPapers: PaganationRequest) {
        const query = toQueryString({
            'paganation.page': requestGetNewPapers.page,
            'paganation.limit': requestGetNewPapers.limit,
        });

        return httpClient.get<ResponseGetNewsPaper>(`/api/Article/news${query}`);
    },
    getComments(articleId: number, paganation: PaganationRequest) {
        const query = toQueryString({
            'paganation.page': paganation.page,
            'paganation.limit': paganation.limit,
        });

        return httpClient.get<CommentsOfArticleResponse>(`/api/Article/comment/${articleId}${query}`);
    },
    comment(articleId: number, payload: RequestWriteComment) {
        const depth = payload.depth ?? (payload.parentCommentId ? 1 : 0);
        const data: Record<string, any> = {
            Body: payload.body,
            status: payload.status ?? 1,
            Depth: depth,
        };

        if (payload.parentCommentId !== undefined && payload.parentCommentId !== null) {
            data.ParentCommentId = payload.parentCommentId;
        }

        if (payload.attachments && payload.attachments.length > 0) {
            data.Attachments = payload.attachments;
        }

        return httpClient.post<ApiResponse<CommentView>>(`/api/Article/comment/${articleId}`, objectToFormData(data));
    },
};
