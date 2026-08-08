import type { BasicArticle } from '@/features/articles/contracts';

export type Reaction = '👍' | '❤️' | '😂' | '😮';
export type ReactionByArticleId = Record<number, string>;
export type CommentDraftByArticleId = Record<number, string>;

export type NewsState = {
    articles: BasicArticle[];
    loading: boolean;
    isDemoMode: boolean;
};

export type NewsFilters = {
    activeTab: string;
    searchQuery: string;
};

export type NewsInteractionState = {
    openMenuArticleId: number | null;
    savedArticleIds: number[];
    hiddenArticleIds: number[];
    reactionByArticleId: ReactionByArticleId;
    commentArticleId: number | null;
    commentDraftByArticleId: CommentDraftByArticleId;
    commentingArticleId: number | null;
    deletingArticleId: number | null;
    openReactionArticleId: number | null;
    notice: string | null;
};

export type ArticleCardProps = {
    article: BasicArticle;
    index: number;
    isDemoMode: boolean;
    openMenuArticleId: number | null;
    savedArticleIds: number[];
    reactionByArticleId: ReactionByArticleId;
    commentArticleId: number | null;
    commentDraftByArticleId: CommentDraftByArticleId;
    commentingArticleId: number | null;
    deletingArticleId: number | null;
    openReactionArticleId: number | null;
    onToggleMenu: (articleId: number) => void;
    onToggleSave: (articleId: number) => void;
    onHideSimilar: (article: BasicArticle) => void;
    onDelete: (article: BasicArticle) => void;
    onOpenReactionPicker: (articleId: number) => void;
    onScheduleCloseReactionPicker: () => void;
    onClearReaction: (articleId: number) => void;
    onSelectReaction: (articleId: number, reaction: Reaction) => void;
    onToggleComments: (articleId: number) => void;
    onCommentDraftChange: (articleId: number, value: string) => void;
    onSubmitComment: (event: React.FormEvent<HTMLFormElement>, article: BasicArticle) => void;
};
