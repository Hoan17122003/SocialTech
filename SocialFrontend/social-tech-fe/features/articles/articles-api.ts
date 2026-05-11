import { objectToFormData } from "@/common/utils/object-to-form-data";
import { httpClient } from "@/shared/api/http-client";
import type {
  ArticleDetailResponse,
  CreateArticleRequest,
  UpdateArticleRequest,
} from "./contracts";

export const articlesApi = {
  create(payload: CreateArticleRequest) {
    return httpClient.post("/api/Article/create", objectToFormData(payload), {
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
};
