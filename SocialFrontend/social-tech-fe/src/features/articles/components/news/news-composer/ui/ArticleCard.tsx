import { useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/common/utils/format-date';
import { Card } from '@/shared/ui/card';
import { AvatarImage } from '@/shared/ui/avatar-image';
import type { ArticleCardProps } from '../types';
import { REACTIONS } from '../constants';
import {
    getAuthorInitials,
    getFileAttachments,
    getArticleCategory,
    getPlainText,
    getStableMetric,
} from '../utils/article.utils';
import { ArticleMedia } from './ArticleMedia';
import { ArticleCommentsThread } from '@/features/articles/components/comment-article/article-comments-thread';

export function ArticleCard({
    article,
    index,
    openMenuArticleId,
    savedArticleIds,
    reactionByArticleId,
    commentArticleId,
    openReactionArticleId,
    deletingArticleId,
    onToggleMenu,
    onToggleSave,
    onHideSimilar,
    onDelete,
    onOpenReactionPicker,
    onScheduleCloseReactionPicker,
    onClearReaction,
    onSelectReaction,
    onToggleComments,
}: ArticleCardProps) {
    const cat = getArticleCategory(article);
    const preview = getPlainText(article.content);
    const hasDetail = Boolean(article.id && preview);
    const fileAttachments = getFileAttachments(article);
    const selectedReaction = reactionByArticleId[article.id];
    const isReactionPickerOpen = openReactionArticleId === article.id;
    const isSaved = savedArticleIds.includes(article.id);
    const [realtimeCommentsCount, setRealtimeCommentsCount] = useState<number | null>(null);
    const baseCommentsCount = getStableMetric(article.id, 2, 18);
    const commentsCount = realtimeCommentsCount !== null ? realtimeCommentsCount : baseCommentsCount;
    const reactionsCount = getStableMetric(article.id, 8, 74) + (selectedReaction ? 1 : 0);

    // Callback ổn định định danh cho ArticleCommentsThread nhằm tránh re-fetch comments khi hover reaction
    const handleCommentCountChange = useCallback((count: number) => {
        setRealtimeCommentsCount(count);
    }, []);

    return (
        <Card
            key={article.id}
            style={{ animationDelay: `${index * 70}ms` }}
            className="relative overflow-visible rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] opacity-0 animate-fade-in-up [animation-fill-mode:forwards] sm:p-5"
        >
            <div className="flex items-start justify-between gap-3">
                <Link href={`/profile/${article.publicIdAuthor}`} className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5">
                        <AvatarImage
                            src={article.avatarAuthor}
                            alt={article.nameAuthor}
                            fallback={getAuthorInitials(article.nameAuthor)}
                            sizes="44px"
                            className="rounded-full bg-[var(--surface-strong)]"
                            fallbackClassName="text-xs font-black text-indigo-400"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--foreground)]">{article.nameAuthor}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                            {formatDateTime(article.createDate)} · {cat}
                        </p>
                    </div>
                </Link>
                <div className="relative" data-news-actions>
                    <button
                        type="button"
                        aria-label="Tùy chọn bài viết"
                        aria-haspopup="menu"
                        aria-expanded={openMenuArticleId === article.id}
                        onClick={() => onToggleMenu(article.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>
                    {openMenuArticleId === article.id && (
                        <div
                            role="menu"
                            className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-1.5 text-xs text-[var(--foreground)] shadow-2xl"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => onToggleSave(article.id)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[var(--bg-hover)]"
                            >
                                <span>{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
                                <span>{isSaved ? '✓' : '🔖'}</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => onHideSimilar(article)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[var(--bg-hover)]"
                            >
                                <span>Tắt bớt bài tương tự</span>
                                <span>🙈</span>
                            </button>
                            {article.isPermissionEdit && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={deletingArticleId === article.id}
                                    onClick={() => onDelete(article)}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                                >
                                    <span>Xóa bài viết</span>
                                    <span>🗑️</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 space-y-3">
                <h3 className="text-lg font-black leading-snug tracking-tight text-[var(--foreground)]">
                    {article.title}
                </h3>
                <p className="text-sm leading-6 text-[var(--foreground)]/85">
                    {preview || 'Bài viết dạng cập nhật nhanh, chưa có phần nội dung chi tiết.'}
                </p>
            </div>
            <div className="mt-4">
                <ArticleMedia article={article} />
            </div>
            {fileAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {fileAttachments.map((attachment) => (
                        <a
                            key={attachment}
                            href={attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[var(--line)] bg-[var(--background-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                            📎 {attachment.split(/[/\\]/).pop() || attachment}
                        </a>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                <span>
                    {selectedReaction || '👍'} {reactionsCount} cảm xúc
                </span>
                <span>{commentsCount} bình luận</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-xs font-bold">
                {/* 
                    Khu vực Reaction:
                    - Rê chuột (onMouseEnter) để mở popover mini chọn cảm xúc.
                    - Rê chuột ra ngoài (onMouseLeave) để lên lịch đóng popover mini.
                    - Chặn hoàn toàn event bubbling bằng preventDefault & stopPropagation để không làm reload trang.
                */}
                <div
                    className="relative"
                    onMouseEnter={() => onOpenReactionPicker(article.id)}
                    onMouseLeave={onScheduleCloseReactionPicker}
                >
                    <button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (selectedReaction) {
                                onClearReaction(article.id);
                            } else {
                                onSelectReaction(article.id, '👍');
                            }
                        }}
                        aria-pressed={Boolean(selectedReaction)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2 transition ${selectedReaction ? 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15' : 'text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]'}`}
                    >
                        {selectedReaction || '👍'} {selectedReaction ? 'Đã react' : 'Like'}
                    </button>
                    {isReactionPickerOpen && (
                        <>
                            <span
                                aria-hidden="true"
                                className="pointer-events-auto absolute bottom-8 left-0 z-10 h-5 w-full"
                            />
                            <div className="absolute bottom-12 left-0 z-20 flex translate-y-0 gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] p-1.5 opacity-100 shadow-xl transition-all duration-300 ease-out">
                                {REACTIONS.map((reaction) => (
                                    <button
                                        key={reaction}
                                        type="button"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            onSelectReaction(article.id, reaction);
                                        }}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-[var(--bg-hover)]"
                                    >
                                        {reaction}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleComments(article.id);
                    }}
                    className={`rounded-2xl px-3 py-2 transition hover:bg-[var(--bg-hover)] ${commentArticleId === article.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-extrabold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                >
                    💬 Bình luận
                </button>
                {hasDetail ? (
                    <Link
                        href={`/articles/${article.id}`}
                        className="rounded-2xl bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 px-3 py-2 text-center text-indigo-400 transition hover:from-indigo-500 hover:to-cyan-500 hover:text-white"
                    >
                        Xem chi tiết
                    </Link>
                ) : (
                    <span className="rounded-2xl px-3 py-2 text-center text-[var(--muted)]/60">Không có detail</span>
                )}
            </div>

            {/* Realtime and Persistent Comment Thread */}
            {commentArticleId === article.id && (
                <ArticleCommentsThread
                    articleId={article.id}
                    onCommentCountChange={handleCommentCountChange}
                />
            )}
        </Card>
    );
}
