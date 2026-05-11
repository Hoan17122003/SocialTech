import type { ApiResponse } from "@/common/types/api";

export type ArticleStatus = "Draft" | "Published" | "Archived";

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
  avatarAuthor: string;
};

export type ArticleDetailResponse = ApiResponse<ArticleDetail>;
