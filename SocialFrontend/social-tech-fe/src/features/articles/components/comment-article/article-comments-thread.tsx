'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatDateTime } from '@/common/utils/format-date';
import { articlesApi } from '@/features/articles/articles-api';
import { createNotificationHubConnection } from '@/shared/api/realtime-client';
import { publicIdStorage } from '@/shared/api/public-id-storage';
import { usersApi } from '@/features/users/users-api';
import type { CommentOfArticleModelView, RealtimeCommentPayload } from '@/features/articles/contracts';
import { AvatarImage } from '@/shared/ui/avatar-image';

export type NormalizedComment = {
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

type Props = {
    articleId: number;
    onCommentCountChange?: (count: number) => void;
    compact?: boolean;
};

export function ArticleCommentsThread({ articleId, onCommentCountChange, compact = false }: Props) {
    const [comments, setComments] = useState<NormalizedComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [draft, setDraft] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [myProfile, setMyProfile] = useState<any | null>(null);
    const localCommentIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const threadRef = useRef<HTMLDivElement | null>(null);

    const loadComments = useCallback(async () => {
        setIsLoading(true);
        try {
            const resp = await articlesApi.getComments(articleId, { page: 1, limit: 50 });
            const data = (resp as any)?.data ?? (resp as any);
            const rawList: CommentOfArticleModelView[] = Array.isArray(data) ? data : data?.items ?? [];
            const normalizedList = rawList.map((item, idx) => normalizeApiComment(item, idx));
            setComments(normalizedList);
            onCommentCountChange?.(normalizedList.length);
        } catch (err) {
            console.error(`Failed to load comments for article ${articleId}:`, err);
        } finally {
            setIsLoading(false);
        }
    }, [articleId, onCommentCountChange]);

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
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

        void loadProfile();
        void loadComments();

        return () => {
            isMounted = false;
        };
    }, [articleId, loadComments]);

    // Realtime SignalR subscription for comments
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
                            onCommentCountChange?.(next.length);
                            return next;
                        }
                    }

                    // Prevent duplicates
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

                    const next = [newComment, ...current];
                    onCommentCountChange?.(next.length);
                    return next;
                });
            } catch (err) {
                console.error('Failed handling realtime comment in thread', err);
            }
        };

        connection.on('commentCreated', handleCommentCreated);

        async function start() {
            try {
                await connection.start();
                hasStarted = true;

                try {
                    await connection.invoke('JoinPostGroup', Number(articleId));
                } catch (err) {
                    console.warn(`Failed to join post group ${articleId}`, err);
                }

                try {
                    await connection.invoke('JoinCommentDisplayGroup', Number(articleId));
                } catch (err) {
                    console.warn(`Failed to join comment display group ${articleId}`, err);
                }
            } catch (err) {
                console.warn('Realtime connection failed in ArticleCommentsThread', err);
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
    }, [articleId, onCommentCountChange]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || isSubmitting) return;

        const localId = `local-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
        const optimisticComment: NormalizedComment = {
            id: localId,
            authorName: myProfile?.displayName ?? 'Bạn',
            authorAvatar: myProfile?.profileImageUrl ?? null,
            content,
            attachments: [],
            createDate: new Date().toISOString(),
            isOptimistic: true,
        };

        localCommentIdRef.current = localId;
        setComments((current) => {
            const next = [optimisticComment, ...current];
            onCommentCountChange?.(next.length);
            return next;
        });

        const currentAttachments = [...attachments];
        setDraft('');
        setAttachments([]);
        setIsSubmitting(true);

        try {
            await articlesApi.comment(articleId, {
                body: content,
                status: 1,
                depth: 0,
                attachments: currentAttachments,
            });
        } catch (err) {
            console.error('Failed to submit comment', err);
            // Rollback optimistic comment
            setComments((current) => {
                const next = current.filter((c) => c.id !== localId);
                onCommentCountChange?.(next.length);
                return next;
            });
            localCommentIdRef.current = null;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        setAttachments((prev) => [...prev, ...Array.from(files)]);
    };

    const myInitials = myProfile?.displayName
        ? myProfile.displayName
              .split(' ')
              .map((s: string) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : 'U';

    return (
        <div ref={threadRef} className="mt-4 pt-3 border-t border-[var(--line)] space-y-4 animate-fade-in">
            {/* Realtime Status indicator */}
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="font-bold flex items-center gap-1.5 text-[var(--foreground)]">
                    <span>💬</span> Bình luận ({comments.length})
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Realtime
                </span>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleSubmit} className="flex gap-2.5 items-start">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--surface-strong)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] border border-[var(--line)] mt-0.5">
                    <AvatarImage
                        src={myProfile?.profileImageUrl}
                        alt={myProfile?.displayName || 'User'}
                        fallback={<span>{myInitials}</span>}
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex gap-2 rounded-2xl border border-[var(--line)] bg-[var(--background-soft)] p-1.5 focus-within:border-[var(--accent)] transition-colors">
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Viết bình luận của bạn..."
                            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Đính kèm tệp"
                            className="flex items-center justify-center h-8 w-8 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                        >
                            📎
                        </button>
                        <button
                            type="submit"
                            disabled={!draft.trim() || isSubmitting}
                            className="rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                        >
                            {isSubmitting ? '...' : 'Gửi'}
                        </button>
                    </div>

                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
                            {attachments.map((file, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5"
                                >
                                    📄 {file.name}
                                    <button
                                        type="button"
                                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                                        className="text-rose-500 hover:text-rose-600 font-bold ml-1"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4 text-xs text-[var(--muted)] gap-2">
                        <svg className="animate-spin h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang tải bình luận...
                    </div>
                ) : comments.length > 0 ? (
                    comments.map((comment) => {
                        const authorInitials = comment.authorName
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
                                className={`flex gap-2.5 items-start p-3 rounded-2xl border text-xs transition-all ${
                                    comment.isOptimistic
                                        ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 opacity-75'
                                        : 'bg-[var(--background-soft)] border-[var(--line)]'
                                }`}
                            >
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[var(--surface)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] border border-[var(--line)]">
                                    <AvatarImage
                                        src={comment.authorAvatar}
                                        alt={comment.authorName}
                                        fallback={<span>{authorInitials}</span>}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="font-bold text-[var(--foreground)] truncate">
                                            {comment.authorName}
                                        </span>
                                        <span className="text-[10px] font-mono text-[var(--muted)] opacity-70 shrink-0">
                                            {formatDateTime(comment.createDate)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                                        {comment.content}
                                    </p>
                                    {comment.attachments && comment.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {comment.attachments.map((att, idx) => (
                                                <a
                                                    key={idx}
                                                    href={att}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                                                >
                                                    📎 Tệp {idx + 1}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-4 text-xs text-[var(--muted)] bg-[var(--background-soft)] rounded-2xl border border-dashed border-[var(--line)]">
                        Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận!
                    </div>
                )}
            </div>
        </div>
    );
}
