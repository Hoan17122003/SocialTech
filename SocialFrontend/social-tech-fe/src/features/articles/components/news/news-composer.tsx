'use client';

import { useMemo, useState } from 'react';
import { SectionShell } from '@/shared/ui/section-shell';
import { useNewsFeed } from './news-composer/hooks/useNewsFeed';
import { useNewsInteractions } from './news-composer/hooks/useNewsInteractions';
import { NEWS_CATEGORIES } from './news-composer/constants';
import { filterNewsArticles } from './news-composer/utils/filter.utils';
import { NewsFeedList } from './news-composer/ui/NewsFeedList';
import { NewsFilters } from './news-composer/ui/NewsFilters';
import { NewsNotice } from './news-composer/ui/NewsNotice';
import { NewsEmptyState, NewsLoading } from './news-composer/ui/NewsState';
import type { Reaction } from './news-composer/types';

export function NewComposer() {
    const { articles, setArticles, loading, isDemoMode } = useNewsFeed();
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const interactions = useNewsInteractions({ isDemoMode, setArticles });
    const filteredArticles = useMemo(
        () => filterNewsArticles(articles, activeTab, searchQuery, interactions.hiddenArticleIds),
        [activeTab, articles, interactions.hiddenArticleIds, searchQuery],
    );

    const selectReaction = (articleId: number, reaction: Reaction) => {
        interactions.setReactionByArticleId((current) => ({ ...current, [articleId]: reaction }));
        interactions.setOpenReactionArticleId(null);
    };

    return (
        <div className="relative min-h-screen py-6 text-[var(--foreground)]">
            <NewsNotice message={interactions.notice} />
            <SectionShell
                eyebrow=""
                title="News"
                description="Luồng bài viết cộng đồng: xem nhanh, tương tác nhanh, chỉ mở chi tiết khi bài có nội dung đầy đủ."
            >
                <NewsFilters
                    categories={NEWS_CATEGORIES as unknown as string[]}
                    activeTab={activeTab}
                    searchQuery={searchQuery}
                    onTabChange={setActiveTab}
                    onSearchChange={setSearchQuery}
                />
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isDemoMode
                        ? 'Đang hiển thị dữ liệu demo vì API chưa có bài phù hợp.'
                        : 'Đang lấy dữ liệu từ API.'}
                </div>
                {loading ? (
                    <NewsLoading />
                ) : filteredArticles.length === 0 ? (
                    <NewsEmptyState />
                ) : (
                    <NewsFeedList
                        articles={filteredArticles}
                        cardProps={{
                            isDemoMode,
                            openMenuArticleId: interactions.openMenuArticleId,
                            savedArticleIds: interactions.savedArticleIds,
                            reactionByArticleId: interactions.reactionByArticleId,
                            commentArticleId: interactions.commentArticleId,
                            commentDraftByArticleId: interactions.commentDraftByArticleId,
                            commentingArticleId: interactions.commentingArticleId,
                            deletingArticleId: interactions.deletingArticleId,
                            openReactionArticleId: interactions.openReactionArticleId,
                            onToggleMenu: (articleId) =>
                                interactions.setOpenMenuArticleId((current) =>
                                    current === articleId ? null : articleId,
                                ),
                            onToggleSave: interactions.toggleSaveArticle,
                            onHideSimilar: interactions.hideSimilarArticle,
                            onDelete: (article) => void interactions.deleteArticle(article),
                            onOpenReactionPicker: interactions.openReactionPicker,
                            onScheduleCloseReactionPicker: interactions.scheduleCloseReactionPicker,
                            onClearReaction: interactions.clearArticleReaction,
                            onSelectReaction: selectReaction,
                            onToggleComments: (articleId) =>
                                interactions.setCommentArticleId((current) =>
                                    current === articleId ? null : articleId,
                                ),
                            onCommentDraftChange: (articleId, value) =>
                                interactions.setCommentDraftByArticleId((current) => ({
                                    ...current,
                                    [articleId]: value,
                                })),
                            onSubmitComment: (event, article) =>
                                void interactions.submitComment(event, article),
                        }}
                    />
                )}
            </SectionShell>
        </div>
    );
}
