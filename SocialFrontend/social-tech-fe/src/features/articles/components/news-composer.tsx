'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { articlesApi } from '@/features/articles/articles-api';
import type { BasicArticle } from '@/features/articles/contracts';
import { formatDateTime } from '@/common/utils/format-date';
import { Card } from '@/shared/ui/card';
import { SectionShell } from '@/shared/ui/section-shell';

const FALLBACK_ARTICLES: BasicArticle[] = [
    {
        id: 101,
        title: 'Gemini 1.5 Pro & Kỷ Nguyên Ngữ Cảnh 2 Triệu Tokens',
        content:
            'Mô hình Gemini 1.5 Pro mới nhất từ Google DeepMind mang đến bước đột phá lịch sử với khả năng xử lý ngữ cảnh cực lớn. Nhà phát triển giờ đây có thể đưa toàn bộ mã nguồn dự án, hàng tá tài liệu PDF dày cộp, hoặc hàng giờ video chất lượng cao vào một prompt duy nhất.',
        attachments: [
            'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
            'https://example.com/gemini-spec.pdf',
        ],
        isPermissionEdit: false,
        createDate: '2026-05-25T10:00:00.000Z',
        nameAuthor: 'Dr. Alexis Wright',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 102,
        title: 'Tailwind CSS v4.0: Kiến Trúc Mới Cho Hiệu Năng Tối Đa',
        content:
            'Phiên bản Tailwind CSS v4.0 đã chính thức ra mắt với trình biên dịch siêu tốc, hỗ trợ CSS Variables gốc và workflow gọn hơn cho đội frontend.',
        attachments: ['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80'],
        isPermissionEdit: false,
        createDate: '2026-05-25T08:30:00.000Z',
        nameAuthor: 'Tech lead Minh Trần',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 103,
        title: 'Bảo Mật API Hệ Thống: Cơ Chế Token Refresh An Toàn Nhất',
        content:
            'Trong ứng dụng web hiện đại, việc quản lý session qua Access Token và Refresh Token đóng vai trò then chốt trong việc bảo vệ dữ liệu người dùng.',
        attachments: [
            'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=1200&q=80',
            'https://example.com/api-security-guide.pdf',
        ],
        isPermissionEdit: false,
        createDate: '2026-05-24T15:45:00.000Z',
        nameAuthor: 'CyberSec Specialist Nam Nguyễn',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 104,
        title: 'Một cập nhật ngắn từ cộng đồng Social Tech',
        content: '',
        attachments: [],
        isPermissionEdit: true,
        createDate: '2026-05-23T11:20:00.000Z',
        nameAuthor: 'Bạn',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: '',
    },
];

const REACTIONS = ['👍', '❤️', '😂', '😮'] as const;

function getArticleCategory(article: BasicArticle): string {
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    if (['ai', 'gemini', 'gpt', 'machine learning', 'trí tuệ'].some((keyword) => text.includes(keyword))) {
        return 'AI & Machine Learning';
    }
    if (['security', 'token', 'refresh', 'jwt', 'bảo mật', 'auth'].some((keyword) => text.includes(keyword))) {
        return 'Cybersecurity';
    }
    if (['css', 'next.js', 'tailwind', 'react', 'frontend', 'giao diện'].some((keyword) => text.includes(keyword))) {
        return 'Frontend Dev';
    }
    return 'General Tech';
}

function getAuthorInitials(name?: string) {
    return name
        ? name
              .split(' ')
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : 'ST';
}

function getPlainText(content?: string) {
    return (content || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#>*_`~\-[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isImageUrl(url: string) {
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url) || url.includes('images.unsplash.com');
}

function getImageAttachments(article: BasicArticle) {
    return (article.attachments || []).filter(isImageUrl);
}

function getFileAttachments(article: BasicArticle) {
    return (article.attachments || []).filter((attachment) => !isImageUrl(attachment));
}

function getStableMetric(articleId: number, base: number, range: number) {
    return base + Math.abs(articleId * 37) % range;
}

function ArticleMedia({ article }: { article: BasicArticle }) {
    const images = getImageAttachments(article);

    if (!images.length) {
        return (
            <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.08))] px-5 py-8 text-center">
                <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                        📰
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Text post</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Bài này chưa có hình ảnh đính kèm.</p>
                </div>
            </div>
        );
    }

    const visibleImages = images.slice(0, 4);

    return (
        <div
            className={`grid overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--background-soft)] ${
                visibleImages.length === 1 ? '' : 'grid-cols-2'
            }`}
        >
            {visibleImages.map((image, index) => (
                <a
                    key={image}
                    href={image}
                    target="_blank"
                    rel="noreferrer"
                    className={`group relative block overflow-hidden ${
                        visibleImages.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                    }`}
                >
                    <img
                        src={image}
                        alt={`${article.title} - hình ${index + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(event) => {
                            event.currentTarget.style.display = 'none';
                        }}
                    />
                    {index === 3 && images.length > 4 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-black text-white">
                            +{images.length - 4}
                        </span>
                    )}
                </a>
            ))}
        </div>
    );
}

export function NewComposer() {
    const [articles, setArticles] = useState<BasicArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [openMenuArticleId, setOpenMenuArticleId] = useState<number | null>(null);
    const [savedArticleIds, setSavedArticleIds] = useState<number[]>([]);
    const [hiddenArticleIds, setHiddenArticleIds] = useState<number[]>([]);
    const [reactionByArticleId, setReactionByArticleId] = useState<Record<number, string>>({});
    const [commentArticleId, setCommentArticleId] = useState<number | null>(null);
    const [commentDraftByArticleId, setCommentDraftByArticleId] = useState<Record<number, string>>({});
    const [commentingArticleId, setCommentingArticleId] = useState<number | null>(null);
    const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
    const [openReactionArticleId, setOpenReactionArticleId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const noticeTimerRef = useRef<number | null>(null);
    const reactionCloseTimerRef = useRef<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchNews() {
            try {
                setLoading(true);
                const response = await articlesApi.news({ page: 1, limit: 20 });
                if (!isMounted) return;

                if (response?.success && response.data?.length) {
                    setArticles(response.data);
                    setIsDemoMode(false);
                } else {
                    setArticles(FALLBACK_ARTICLES);
                    setIsDemoMode(true);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('API Error, switching to mock database:', err);
                setArticles(FALLBACK_ARTICLES);
                setIsDemoMode(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        void fetchNews();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!openMenuArticleId) return;

        const closeMenu = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest('[data-news-actions]')) {
                setOpenMenuArticleId(null);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenuArticleId(null);
        };

        document.addEventListener('pointerdown', closeMenu);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeMenu);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [openMenuArticleId]);

    useEffect(() => {
        return () => {
            if (reactionCloseTimerRef.current) {
                window.clearTimeout(reactionCloseTimerRef.current);
            }
        };
    }, []);

    const openReactionPicker = (articleId: number) => {
        /*
            Hover reaction UX:
            - Mở bằng hover/focus, không mở bằng click.
            - Clear timeout cũ để khi rê chuột từ nút lên list, picker không bị đóng giữa chừng.
        */
        if (reactionCloseTimerRef.current) {
            window.clearTimeout(reactionCloseTimerRef.current);
        }
        setOpenReactionArticleId(articleId);
    };

    const scheduleCloseReactionPicker = () => {
        /*
            Delay đóng tạo cảm giác mượt và tha thứ cho đường rê chuột.
            Nếu user lỡ đi qua khoảng nhỏ giữa nút và list, popover vẫn còn sống thêm 260ms.
        */
        if (reactionCloseTimerRef.current) {
            window.clearTimeout(reactionCloseTimerRef.current);
        }
        reactionCloseTimerRef.current = window.setTimeout(() => {
            setOpenReactionArticleId(null);
        }, 260);
    };

    const clearArticleReaction = (articleId: number) => {
        /*
            Click nút chính không dùng để mở list nữa.
            Nó chỉ reset reaction của bài về trạng thái Like mặc định/inactive đúng theo yêu cầu.
        */
        setReactionByArticleId((current) => {
            const next = { ...current };
            delete next[articleId];
            return next;
        });
    };

    const showNotice = (message: string) => {
        setNotice(message);
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2600);
    };

    const categories = ['All', 'AI & Machine Learning', 'Frontend Dev', 'Cybersecurity', 'General Tech'];

    const filteredArticles = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return articles.filter((article) => {
            if (hiddenArticleIds.includes(article.id)) return false;

            const categoryMatch = activeTab === 'All' || getArticleCategory(article) === activeTab;
            const searchMatch =
                !normalizedSearch ||
                article.title.toLowerCase().includes(normalizedSearch) ||
                (article.content || '').toLowerCase().includes(normalizedSearch) ||
                article.nameAuthor.toLowerCase().includes(normalizedSearch);

            return categoryMatch && searchMatch;
        });
    }, [activeTab, articles, hiddenArticleIds, searchQuery]);

    const toggleSaveArticle = (articleId: number) => {
        setSavedArticleIds((current) =>
            current.includes(articleId) ? current.filter((id) => id !== articleId) : [...current, articleId],
        );
        setOpenMenuArticleId(null);
        showNotice(savedArticleIds.includes(articleId) ? 'Đã bỏ lưu bài viết.' : 'Đã lưu bài viết vào danh sách.');
    };

    const hideSimilarArticle = (article: BasicArticle) => {
        setHiddenArticleIds((current) => [...current, article.id]);
        setOpenMenuArticleId(null);
        showNotice(`Đã ẩn bớt bài tương tự "${getArticleCategory(article)}".`);
    };

    const deleteArticle = async (article: BasicArticle) => {
        setOpenMenuArticleId(null);
        if (!article.isPermissionEdit) return;
        if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;

        setDeletingArticleId(article.id);
        try {
            if (!isDemoMode) {
                await articlesApi.remove(article.id);
            }
            setArticles((current) => current.filter((item) => item.id !== article.id));
            showNotice('Đã xóa bài viết.');
        } catch (err) {
            console.error('Failed to delete article:', err);
            showNotice('Không thể xóa bài viết. Vui lòng thử lại.');
        } finally {
            setDeletingArticleId(null);
        }
    };

    const submitComment = async (event: FormEvent<HTMLFormElement>, article: BasicArticle) => {
        event.preventDefault();
        const draft = (commentDraftByArticleId[article.id] || '').trim();
        if (!draft || commentingArticleId) return;

        setCommentingArticleId(article.id);
        try {
            if (!isDemoMode) {
                await articlesApi.comment(article.id, draft);
            }
            setCommentDraftByArticleId((current) => ({ ...current, [article.id]: '' }));
            showNotice('Đã gửi bình luận.');
        } catch (err) {
            console.error('Failed to comment article:', err);
            showNotice('Không thể gửi bình luận. Vui lòng thử lại.');
        } finally {
            setCommentingArticleId(null);
        }
    };

    return (
        <div className="relative min-h-screen py-6 text-[var(--foreground)]">
            {notice && (
                <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-xl">
                    {notice}
                </div>
            )}

            <SectionShell
                eyebrow=""
                title="News"
                description="Luồng bài viết cộng đồng: xem nhanh, tương tác nhanh, chỉ mở chi tiết khi bài có nội dung đầy đủ."
            >
                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex flex-wrap gap-2.5">
                        {categories.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                                            : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    {tab === 'All' ? 'Tất cả' : tab}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full md:w-80">
                        <svg
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Tìm bài viết..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] shadow-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isDemoMode ? 'Đang hiển thị dữ liệu demo vì API chưa có bài phù hợp.' : 'Đang lấy dữ liệu từ API.'}
                </div>

                {loading ? (
                    <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center gap-4">
                        <div className="relative h-12 w-12">
                            <div className="absolute inset-0 rounded-full border-4 border-[var(--line)]" />
                            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[var(--accent)]" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Đang tải bảng tin...
                        </p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center">
                        <div className="mb-3 text-4xl">🗂️</div>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">Không có bài viết phù hợp</h4>
                        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--muted)]">
                            Thử đổi bộ lọc, xóa từ khóa tìm kiếm hoặc tải lại bảng tin nhé.
                        </p>
                    </div>
                ) : (
                    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-6">
                        {filteredArticles.map((article, index) => {
                            const cat = getArticleCategory(article);
                            const authorInitials = getAuthorInitials(article.nameAuthor);
                            const preview = getPlainText(article.content);
                            const hasDetail = Boolean(article.id && preview);
                            const fileAttachments = getFileAttachments(article);
                            const selectedReaction = reactionByArticleId[article.id];
                            const isReactionPickerOpen = openReactionArticleId === article.id;
                            const isSaved = savedArticleIds.includes(article.id);
                            const commentsCount = getStableMetric(article.id, 2, 18);
                            const reactionsCount = getStableMetric(article.id, 8, 74) + (selectedReaction ? 1 : 0);

                            return (
                                <Card
                                    key={article.id}
                                    style={{ animationDelay: `${index * 70}ms` }}
                                    className="relative overflow-visible rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] opacity-0 animate-fade-in-up [animation-fill-mode:forwards] sm:p-5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <Link
                                            href={`/profile/${article.publicIdAuthor}`}
                                            className="flex min-w-0 items-center gap-3"
                                        >
                                            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5">
                                                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[var(--surface-strong)]">
                                                    {article.avatarAuthor ? (
                                                        <img
                                                            src={article.avatarAuthor}
                                                            alt={article.nameAuthor}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-black text-indigo-400">
                                                            {authorInitials}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-[var(--foreground)]">
                                                    {article.nameAuthor}
                                                </p>
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
                                                onClick={() =>
                                                    setOpenMenuArticleId((current) =>
                                                        current === article.id ? null : article.id,
                                                    )
                                                }
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
                                                        onClick={() => toggleSaveArticle(article.id)}
                                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[var(--bg-hover)]"
                                                    >
                                                        <span>{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
                                                        <span>{isSaved ? '✓' : '🔖'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => hideSimilarArticle(article)}
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
                                                            onClick={() => void deleteArticle(article)}
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
                                            {fileAttachments.map((attachment) => {
                                                const filename = attachment.split(/[/\\]/).pop() || attachment;
                                                return (
                                                    <a
                                                        key={attachment}
                                                        href={attachment}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-full border border-[var(--line)] bg-[var(--background-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                                    >
                                                        📎 {filename}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                                        <span>
                                            {selectedReaction || '👍'} {reactionsCount} cảm xúc
                                        </span>
                                        <span>{commentsCount} bình luận</span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-xs font-bold">
                                        <div
                                            className="relative"
                                            onMouseEnter={() => openReactionPicker(article.id)}
                                            onMouseLeave={scheduleCloseReactionPicker}
                                            onFocus={() => openReactionPicker(article.id)}
                                            onBlur={(event) => {
                                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                                    scheduleCloseReactionPicker();
                                                }
                                            }}
                                        >
                                            {/*
                                                Hover reaction picker:
                                                - Không dùng <details> hoặc click-to-open nữa vì user muốn hover là thấy list.
                                                - Vùng active gồm nút chính + bridge vô hình + list cảm xúc.
                                                - Timer đóng 260ms giúp popover biến mất từ từ và không tắt khi rê chuột hơi lệch.
                                                - Click nút chính chỉ clear reaction, đưa bài về trạng thái Like inactive/default.
                                                - State vẫn lưu theo article.id để mỗi bài nhớ reaction đã chọn riêng.
                                            */}
                                            <button
                                                type="button"
                                                onClick={() => clearArticleReaction(article.id)}
                                                aria-pressed={Boolean(selectedReaction)}
                                                className={`flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2 transition ${
                                                    selectedReaction
                                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15'
                                                        : 'text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]'
                                                }`}
                                            >
                                                {selectedReaction || '👍'} {selectedReaction ? 'Đã react' : 'Like'}
                                            </button>
                                            {isReactionPickerOpen && (
                                                <>
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute bottom-8 left-0 z-10 h-5 w-full pointer-events-auto"
                                                    />
                                                    <div className="absolute bottom-12 left-0 z-20 flex translate-y-0 gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] p-1.5 opacity-100 shadow-xl transition-all duration-300 ease-out">
                                                        {/*
                                                            Chỉ render picker của article đang active.
                                                            Nếu hover bài A thì openReactionArticleId = A.id, các bài khác không có popover trong DOM,
                                                            tránh tình trạng nhiều list cảm xúc cùng xuất hiện hoặc bắt pointer event nhầm.
                                                        */}
                                                        {REACTIONS.map((reaction) => (
                                                            <button
                                                                key={reaction}
                                                                type="button"
                                                                onClick={() => {
                                                                    setReactionByArticleId((current) => ({
                                                                        ...current,
                                                                        [article.id]: reaction,
                                                                    }));
                                                                    setOpenReactionArticleId(null);
                                                                }}
                                                                className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-[var(--bg-hover)] hover:scale-110"
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
                                            onClick={() =>
                                                setCommentArticleId((current) =>
                                                    current === article.id ? null : article.id,
                                                )
                                            }
                                            className="rounded-2xl px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]"
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
                                            <span className="rounded-2xl px-3 py-2 text-center text-[var(--muted)]/60">
                                                Không có detail
                                            </span>
                                        )}
                                    </div>

                                    {commentArticleId === article.id && (
                                        <form
                                            onSubmit={(event) => void submitComment(event, article)}
                                            className="mt-3 flex gap-2 rounded-2xl border border-[var(--line)] bg-[var(--background-soft)] p-2"
                                        >
                                            <input
                                                type="text"
                                                value={commentDraftByArticleId[article.id] || ''}
                                                onChange={(event) =>
                                                    setCommentDraftByArticleId((current) => ({
                                                        ...current,
                                                        [article.id]: event.target.value,
                                                    }))
                                                }
                                                placeholder="Viết bình luận..."
                                                className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                                            />
                                            <button
                                                type="submit"
                                                disabled={
                                                    !(commentDraftByArticleId[article.id] || '').trim() ||
                                                    commentingArticleId === article.id
                                                }
                                                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                                            >
                                                Gửi
                                            </button>
                                        </form>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </SectionShell>
        </div>
    );
}
