import { objectToFormData } from '@/common/utils/object-to-form-data';
import { httpClient } from '@/shared/api/http-client';
import { ResponseGetNewsPaper, type ArticleDetailResponse, type CreateArticleRequest, type RequestGetNewsPaper, type UpdateArticleRequest } from './contracts';
import { toQueryString } from '@/common/utils/query-string';

export const articlesApi = {
    create(payload: CreateArticleRequest) {
        return httpClient.post('/api/Article/create', objectToFormData(payload), {
            auth: true,
        });
    },
    getDetail(articleId: number) {
        return httpClient.get<ArticleDetailResponse>(`/api/Article/detail/${articleId}`, {
            auth: true,
        });
    },
    update(articleId: number, payload: UpdateArticleRequest) {
        return httpClient.put(`/api/Article/update/${articleId}`, objectToFormData(payload), {
            auth: true,
        });
    },
    remove(articleId: number) {
        return httpClient.delete(`/api/Article/delete/${articleId}`, {
            auth: true,
        });
    },
    news(requestGetNewPapers: RequestGetNewsPaper) {
        const query = toQueryString({
            "paganation.page": requestGetNewPapers.page,
            "paganation.limit": requestGetNewPapers.limit
        })
        return httpClient.get<ResponseGetNewsPaper>(`/api/Article/news${requestGetNewPapers}`, {
            auth: true
        })
    }
};
