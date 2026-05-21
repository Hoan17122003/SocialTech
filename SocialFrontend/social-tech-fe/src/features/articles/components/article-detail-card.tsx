'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/common/utils/format-date';
import { ApiError } from '@/common/types/api';
import { articlesApi } from '@/features/articles/articles-api';
import type { ArticleDetail } from '@/features/articles/contracts';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { SectionShell } from '@/shared/ui/section-shell';

export function ArticleDetailCard({ articleId }: { articleId: number }) {
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
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

        void load();

        return () => {
            isMounted = false;
        };
    }, [articleId]);

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
        ? article.nameAuthor.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'A';

    return (
        <div className="animate-fade-in-up">
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
                                    <span className="text-xs font-bold text-[var(--accent)]">
                                        {authorInitials}
                                    </span>
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
                                    // Extract filename from URL/path
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
                </Card>
            </SectionShell>
        </div>
    );
}
