'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatDateTime } from '@/common/utils/format-date';
import { ApiError } from '@/common/types/api';
import { articlesApi } from '@/features/articles/articles-api';
import CommentComposer from './comment-article/comment-composer';
import { createNotificationHubConnection } from '@/shared/api/realtime-client';
import { publicIdStorage } from '@/shared/api/public-id-storage';
import { usersApi } from '@/features/users/users-api';
import type { ArticleDetail, CommentOfArticleModelView, RealtimeCommentPayload, RequestWriteComment } from '@/features/articles/contracts';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { SectionShell } from '@/shared/ui/section-shell';
import { AvatarImage } from '@/shared/ui/avatar-image';

type NormalizedComment = {
    id: string | number;
    authorName: string;
    authorAvatar: string | null;
    authorPublicId?: number | null;
    content: string;
    attachments: string[];
    createDate: string;
    isPermissionEdit?: boolean;
    isOptimistic?: boolean;
};

function normalizeApiComment(raw: CommentOfArticleModelView, index: number): NormalizedComment {
    const authorName = raw.authorOfComment?.nameAuthor || 'Người dùng';
    const authorAvatar = raw.authorOfComment?.avatarAuthor || null;
    const authorPublicId = raw.authorOfComment?.authorPublicId ?? null;
    const content = raw.content || '';
    const attachments = raw.attachments || [];
    const createDate = raw.createDate || new Date().toISOString();

    return {
        id: raw.id ?? `api-${authorPublicId ?? index}-${createDate}-${content.slice(0, 10)}`,
        authorName,
        authorAvatar,
        authorPublicId,
        content,
        attachments,
        createDate,
        isPermissionEdit: Boolean(raw.isPermissionEdit),
        isOptimistic: false,
    };
}

function normalizeRealtimeComment(payload: RealtimeCommentPayload | any): NormalizedComment {
    const authorName =
        payload.authorDisplayName ??
        payload.authorOfComment?.nameAuthor ??
        payload.nameAuthor ??
        payload.NameAuthor ??
        'Người dùng';

    const authorAvatar =
        payload.authorAvatarUrl ??
        payload.authorOfComment?.avatarAuthor ??
        payload.avatarAuthor ??
        payload.avatar ??
        null;

    const authorPublicId =
        payload.authorId ??
        payload.authorOfComment?.authorPublicId ??
        payload.authorPublicId ??
        null;

    const content = payload.body ?? payload.content ?? payload.Body ?? payload.Content ?? '';
    const attachments = payload.attachments ?? payload.Attachments ?? [];
    const createDate =
        payload.createdAtUtc ??
        payload.createDate ??
        payload.createdAt ??
        payload.CreateDate ??
        new Date().toISOString();

    return {
        id: payload.id ?? payload.commentId ?? payload.CommentId ?? `rt-${Date.now()}-${Math.random()}`,
        authorName,
        authorAvatar,
        authorPublicId,
        content,
        attachments,
        createDate,
        isPermissionEdit: Boolean(payload.isPermissionEdit),
        isOptimistic: false,
    };
}

export function ArticleDetailCard({ articleId }: { articleId: number }) {
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [comments, setComments] = useState<NormalizedComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [popup, setPopup] = useState<string | null>(null);
    const commentsRef = useRef<HTMLDivElement | null>(null);
    const [myProfile, setMyProfile] = useState<any | null>(null);
    const localCommentIdRef = useRef<string | null>(null);

    const loadComments = useCallback(async () => {
        setIsLoadingComments(true);
        try {
            const resp = await articlesApi.getComments(articleId, { page: 1, limit: 50 });
            const data = (resp as any)?.data ?? (resp as any);
            const rawList: CommentOfArticleModelView[] = Array.isArray(data) ? data : data?.items ?? [];
            const normalizedList = rawList.map((item, idx) => normalizeApiComment(item, idx));
            setComments(normalizedList);
        } catch (err) {
            console.error('Failed loading comments', err);
        } finally {
            setIsLoadingComments(false);
        }
    }, [articleId]);

    useEffect(() => {
        let isMounted = true;

        async function loadArticle() {
            try {
                const response = await articlesApi.getDetail(articleId);
                if (isMounted) {
                    setArticle(response.data);
                    setError(null);
                }
            } catch (cause) {
                if (isMounted) {
                    setError(cause instanceof ApiError ? cause.message : 'Không thể tải chi tiết bài viết.');
                }
            }
        }

        async function loadMyProfile() {
            try {
                const publicId = publicIdStorage.get();
                if (!publicId) return;
                const resp = await usersApi.getProfile(publicId);
                if (isMounted) {
                    setMyProfile(resp.data ?? null);
                }
            } catch {
                // ignore
            }
        }

        void loadArticle();
        void loadMyProfile();
        void loadComments();

        return () => {
            isMounted = false;
        };
    }, [articleId, loadComments]);

    // Realtime comments subscription via SignalR NotificationHub
    useEffect(() => {
        const connection = createNotificationHubConnection();
        let hasStarted = false;
        let isDisposed = false;

        const handleCommentCreated = (payload: any) => {
            if (isDisposed || !payload) return;

            try {
                const eventArticleId = payload.postId ?? payload.ArticleId ?? payload.articleId ?? payload.articleID;
                if (eventArticleId && Number(eventArticleId) !== Number(articleId)) {
                    return;
                }

                const newComment = normalizeRealtimeComment(payload);

                setComments((current) => {
                    // Check if matching optimistic comment exists and replace it
                    const localId = localCommentIdRef.current;
                    if (localId) {
                        const localIndex = current.findIndex((c) => c.id === localId);
                        if (localIndex !== -1) {
                            const next = [...current];
                            next[localIndex] = newComment;
                            localCommentIdRef.current = null;
                            return next;
                        }
                    }

                    // Avoid duplicate comments by ID or same content+author timestamp
                    const alreadyExists = current.some(
                        (c) =>
                            c.id === newComment.id ||
                            (c.content === newComment.content &&
                                c.authorName === newComment.authorName &&
                                Math.abs(new Date(c.createDate).getTime() - new Date(newComment.createDate).getTime()) < 3000),
                    );

                    if (alreadyExists) {
                        return current;
                    }

                    // Prepend new realtime comment to top
                    return [newComment, ...current];
                });
            } catch (err) {
                console.error('Failed handling realtime commentCreated event', err);
            }
        };

        connection.on('commentCreated', handleCommentCreated);

        async function start() {
            try {
                await connection.start();
                hasStarted = true;

                // Join both post group and comment display group for realtime broadcast
                try {
                    await connection.invoke('JoinPostGroup', Number(articleId));
                } catch (err) {
                    console.warn(`Failed to join post group for article ${articleId}`, err);
                }

                try {
                    await connection.invoke('JoinCommentDisplayGroup', Number(articleId));
                } catch (err) {
                    console.warn(`Failed to join comment display group for article ${articleId}`, err);
                }
            } catch (err) {
                console.warn('Notification hub connection failed in ArticleDetailCard', err);
            }
        }

        void start();

        return () => {
            isDisposed = true;
            connection.off('commentCreated', handleCommentCreated);

            if (hasStarted) {
                connection
                    .invoke('LeavePostGroup', Number(articleId))
                    .catch((err) => console.warn(`Failed to leave post group ${articleId}`, err));

                connection
                    .invoke('LeaveCommentDisplayGroup', Number(articleId))
                    .catch((err) => console.warn(`Failed to leave comment display group ${articleId}`, err));

                void connection.stop().catch((err) => {
                    console.error('Failed to stop notification hub connection', err);
                });
            }
        };
    }, [articleId]);

    const handlePostComment = async (payload: RequestWriteComment) => {
        const localId = `local-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
        const localComment: NormalizedComment = {
            id: localId,
            authorName: myProfile?.displayName ?? 'Bạn',
            authorAvatar: myProfile?.profileImageUrl ?? null,
            content: payload.body,
            attachments: [],
            createDate: new Date().toISOString(),
            isOptimistic: true,
        };

        localCommentIdRef.current = localId;
        setComments((current) => [localComment, ...current]);

        try {
            setPopup('Đang gửi bình luận...');
            await articlesApi.comment(articleId, {
                body: payload.body,
                status: 1,
                depth: payload.depth ?? 0,
                parentCommentId: payload.parentCommentId ?? null,
                attachments: payload.attachments ?? [],
            });

            setPopup('Đã gửi bình luận');
            commentsRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error('Failed to post comment', err);
            setPopup('Không gửi được bình luận');
            setComments((current) => current.filter((c) => c.id !== localId));
            localCommentIdRef.current = null;
        } finally {
            window.setTimeout(() => setPopup(null), 3000);
        }
    };

    if (error) {
        return <EmptyState title="Không tải được bài viết" description={error} />;
    }

    if (!article) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center space-y-4">
                    <svg className="animate-spin h-10 w-10 text-[var(--accent)] mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm font-semibold text-[var(--muted)]">Đang kết xuất chi tiết bài viết...</p>
                </div>
            </div>
        );
    }

    const authorInitials = article.nameAuthor
        ? article.nameAuthor.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'A';

    return (
        <div className="animate-fade-in-up">
            {popup && (
                <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-[var(--surface-strong)] border border-[var(--line)] px-4 py-3 shadow-2xl text-xs font-bold text-[var(--foreground)] animate-fade-in">
                    {popup}
                </div>
            )}

            <SectionShell
                eyebrow="Article Engine / View"
                title="Chi tiết bài viết"
                description="Trang đọc nội dung bài viết và tải xuống các phương tiện đính kèm được xuất bản."
            >
                <Card className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--surface)] p-8 md:p-10 shadow-[var(--shadow)] relative overflow-hidden mt-4">
                    {/* Ambient Glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />

                    {/* Article Header */}
                    <div className="border-b border-[var(--line)] pb-6 mb-8 space-y-5 relative z-10">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded-full border border-[var(--accent)]/15 font-semibold">
                                Article View
                            </span>
                            <span className="text-xs text-[var(--muted)]">•</span>
                            <span className="text-xs text-[var(--muted)] font-semibold">
                                ID: {articleId}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)] tracking-tight leading-tight">
                            {article.title}
                        </h1>

                        {/* Author info & metadata */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4facfe] p-0.5 shadow-sm">
                                <div className="h-full w-full rounded-full bg-[var(--surface)] flex items-center justify-center overflow-hidden">
                                    <AvatarImage
                                        src={article.avatarAuthor}
                                        alt={article.nameAuthor}
                                        fallback={<span className="text-xs font-bold text-[var(--accent)]">{authorInitials}</span>}
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--foreground)] leading-none">{article.nameAuthor}</p>
                                <p className="text-[11px] text-[var(--muted)] mt-1.5">Xuất bản lúc {formatDateTime(article.createDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Article Content */}
                    <div className="prose prose-indigo max-w-none text-base leading-8 text-[var(--foreground)] opacity-95 relative z-10 whitespace-pre-wrap">
                        {article.content}
                    </div>

                    {/* Attachments Section */}
                    <div className="mt-10 pt-8 border-t border-[var(--line)] relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="h-4.5 w-4.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                                Tệp đính kèm (Attachments)
                            </h3>
                        </div>

                        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                            {article.attachments?.length ? (
                                article.attachments.map((attachment) => {
                                    const filename = attachment.split(/[/\\]/).pop() || attachment;
                                    return (
                                        <a
                                            key={attachment}
                                            href={attachment}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-sm font-semibold hover:border-[var(--accent)] hover:bg-[var(--surface)] transition-all duration-300 shadow-sm"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <svg className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-xs text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
                                                    {filename}
                                                </span>
                                            </div>
                                            <svg className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    );
                                })
                            ) : (
                                <div className="sm:col-span-2 md:col-span-3 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--background-soft)] px-5 py-6 text-xs text-[var(--muted)] text-center">
                                    Bài viết này chưa được đính kèm bất kỳ phương tiện nào.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="mt-8 pt-6 border-t border-[var(--line)] relative z-10" ref={commentsRef}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                                    Bình luận
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-bold text-[var(--accent)]">
                                    {comments.length}
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Realtime Sync
                            </span>
                        </div>

                        <div className="space-y-4">
                            <CommentComposer
                                authorAvatar={myProfile?.profileImageUrl}
                                authorName={myProfile?.displayName}
                                onSubmit={handlePostComment}
                            />

                            <div className="mt-6 space-y-3">
                                {isLoadingComments ? (
                                    <div className="flex items-center justify-center py-8 text-sm text-[var(--muted)]">
                                        <svg className="animate-spin h-5 w-5 text-[var(--accent)] mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang tải bình luận...
                                    </div>
                                ) : comments.length ? (
                                    comments.map((comment) => {
                                        const initials = comment.authorName
                                            ? comment.authorName
                                                  .split(' ')
                                                  .map((s) => s[0])
                                                  .slice(0, 2)
                                                  .join('')
                                                  .toUpperCase()
                                            : 'U';

                                        return (
                                            <div
                                                key={comment.id}
                                                className={`flex gap-3.5 items-start p-4 rounded-2xl border transition-all ${
                                                    comment.isOptimistic
                                                        ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 opacity-75'
                                                        : 'bg-[var(--background-soft)] border-[var(--line)] hover:border-[var(--accent)]/20'
                                                }`}
                                            >
                                                <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-[var(--surface)] flex items-center justify-center text-xs font-bold text-[var(--accent)] border border-[var(--line)]">
                                                    <AvatarImage
                                                        src={comment.authorAvatar}
                                                        alt={comment.authorName}
                                                        fallback={<span>{initials}</span>}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-[var(--foreground)]">
                                                            {comment.authorName}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--muted)] font-mono">
                                                            {formatDateTime(comment.createDate)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 text-xs sm:text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                                                        {comment.content}
                                                    </p>

                                                    {comment.attachments && comment.attachments.length > 0 && (
                                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                                            {comment.attachments.map((att, attIdx) => (
                                                                <a
                                                                    key={attIdx}
                                                                    href={att}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                                                                >
                                                                    📎 Tệp đính kèm {attIdx + 1}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--muted)]">
                                        Chưa có bình luận nào. Hãy là người đầu tiên bình luận bài viết này!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </SectionShell>
        </div>
    );
}

