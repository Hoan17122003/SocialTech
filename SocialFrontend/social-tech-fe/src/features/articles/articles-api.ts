import { objectToFormData } from '@/common/utils/object-to-form-data';
import { httpClient } from '@/shared/api/http-client';
import {
    ResponseGetNewsPaper,
    type ArticleDetailResponse,
    type CreateArticleRequest,
    type UpdateArticleRequest,
} from './contracts';
import { toQueryString } from '@/common/utils/query-string';
import { PaganationRequest } from '@/common/contract/CommonContract';

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

        return httpClient.get(`/api/Article/comments${articleId}${query}`);
    },
    comment(articleId: number, content: string) {
        return httpClient.post(`/api/Article/comment/${articleId}`, { content });
    },
};
