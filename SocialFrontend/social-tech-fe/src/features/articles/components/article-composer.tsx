'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { ApiError } from '@/common/types/api';
import { toRenderableImageSrc } from '@/common/utils/image-source';
import { articlesApi } from '@/features/articles/articles-api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input, Textarea } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';
import { SectionShell } from '@/shared/ui/section-shell';
import { useTheme } from '@/providers/theme-provider';

const MarkdownEditor = dynamic(() => import('@uiw/react-md-editor'), {
    ssr: false,
    loading: () => (
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--background-soft)] px-4 py-6 text-sm text-[var(--muted)]">
            Đang tải Markdown editor...
        </div>
    ),
});

type ArticleMode = 'standard' | 'tech';
type MarkdownTab = 'write' | 'preview';
type AttachmentSource = 'inline' | 'media';
type SlashCommandId = 'h1' | 'h2' | 'h3' | 'bullet' | 'checklist' | 'quote' | 'code' | 'table' | 'image';

type SlashCommand = {
    id: SlashCommandId;
    label: string;
    description: string;
    searchTerms: string[];
};

type SlashCommandMatch = {
    from: number;
    to: number;
    query: string;
};

type ArticleFormState = {
    title: string;
    content: string;
    comunityId: string;
    articleStatus: 'Draft' | 'Published';
    attachments: File[];
};

type AttachmentPreview = {
    id: string;
    file: File;
    kind: 'image' | 'video' | 'gif' | 'file';
    source: AttachmentSource;
    url: string;
};

const initialState: ArticleFormState = {
    title: '',
    content: '',
    comunityId: '',
    articleStatus: 'Published',
    attachments: [],
};

const starterMarkdown = `# Tieu de chinh

Mo ta ngan cho bai viet tech cua ban.

## Y chinh

- Diem 1
- Diem 2
- Diem 3

\`\`\`ts
export function example() {
    return 'Social Tech';
}
\`\`\`
`;

const slashCommands: SlashCommand[] = [
    {
        id: 'h1',
        label: 'Heading 1',
        description: 'Chen tieu de cap 1',
        searchTerms: ['heading', 'title', 'h1'],
    },
    {
        id: 'h2',
        label: 'Heading 2',
        description: 'Chen tieu de cap 2',
        searchTerms: ['heading', 'title', 'h2'],
    },
    {
        id: 'h3',
        label: 'Heading 3',
        description: 'Chen tieu de cap 3',
        searchTerms: ['heading', 'title', 'h3'],
    },
    {
        id: 'bullet',
        label: 'Bullet List',
        description: 'Chen dau dong danh sach',
        searchTerms: ['list', 'bullet', 'ul'],
    },
    {
        id: 'checklist',
        label: 'Checklist',
        description: 'Chen task list markdown',
        searchTerms: ['todo', 'task', 'checklist'],
    },
    {
        id: 'quote',
        label: 'Quote',
        description: 'Chen blockquote',
        searchTerms: ['quote', 'blockquote'],
    },
    {
        id: 'code',
        label: 'Code Block',
        description: 'Chen code block co san',
        searchTerms: ['code', 'snippet', 'ts'],
    },
    {
        id: 'table',
        label: 'Table',
        description: 'Chen markdown table',
        searchTerms: ['table', 'grid'],
    },
    {
        id: 'image',
        label: 'Image Upload',
        description: 'Mo hop chon anh chen vao noi dung',
        searchTerms: ['image', 'photo', 'upload', 'anh'],
    },
];

function getAttachmentKind(file: File): AttachmentPreview['kind'] {
    if (file.type === 'image/gif') {
        return 'gif';
    }

    if (file.type.startsWith('image/')) {
        return 'image';
    }

    if (file.type.startsWith('video/')) {
        return 'video';
    }

    return 'file';
}

function buildAttachmentId(file: File) {
    // Tao ID on dinh de noi markdown `upload://...` voi file preview dang giu o client.
    const safeName = file.name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return `${safeName || 'file'}-${file.lastModified}-${file.size}`;
}

function transformMarkdownUrl(url: string) {
    // Giu nguyen pseudo URL cho anh inline de custom renderer tu xu ly o buoc preview.
    if (url.startsWith('upload://')) {
        return url;
    }

    return url;
}

function extractInlineUploadIds(content: string) {
    const ids = new Set<string>();
    const uploadPattern = /upload:\/\/([a-z0-9-]+)/gi;

    for (const match of content.matchAll(uploadPattern)) {
        const id = match[1]?.trim();
        if (id) {
            ids.add(id);
        }
    }

    return ids;
}

function extractUploadPreviewId(src: string) {
    // Editor/markdown pipeline co the encode URL hoac boc boi `< >`, nen can normalize truoc khi map.
    const normalizedSrc = [src, decodeURIComponent(src)]
        .map((value) => value.trim().replace(/^<|>$/g, ''))
        .find(Boolean);

    if (!normalizedSrc) {
        return null;
    }

    const match = normalizedSrc.match(/upload:\/\/([a-z0-9-]+)/i);
    return match?.[1] ?? null;
}

function getSubmissionAttachments(previews: AttachmentPreview[], content: string) {
    // Chi gui media doc lap va inline image van con duoc tham chieu trong noi dung markdown.
    const inlineIds = extractInlineUploadIds(content);

    return previews
        .filter((preview) => preview.source === 'media' || inlineIds.has(preview.id))
        .map((preview) => preview.file);
}

function getSlashCommandMatch(content: string, caretPosition: number) {
    const lineStart = content.lastIndexOf('\n', Math.max(0, caretPosition - 1)) + 1;
    const textBeforeCaret = content.slice(lineStart, caretPosition);
    const match = textBeforeCaret.match(/(?:^|\s)\/([a-z0-9-]*)$/i);

    if (!match) {
        return null;
    }

    const slashOffset = match.index ?? 0;
    const from = lineStart + (match[0].startsWith('/') ? slashOffset : slashOffset + 1);

    return {
        from,
        to: caretPosition,
        query: match[1]?.toLowerCase() ?? '',
    } satisfies SlashCommandMatch;
}

function getMatchingSlashCommands(query: string) {
    if (!query) {
        return slashCommands;
    }

    return slashCommands.filter((command) => {
        const haystacks = [command.label, command.description, ...command.searchTerms].map((value) =>
            value.toLowerCase(),
        );
        return haystacks.some((value) => value.includes(query));
    });
}

function getTextareaCaretPosition(textarea: HTMLTextAreaElement, caretPosition: number) {
    const mirror = document.createElement('div');
    const mirrorStyle = window.getComputedStyle(textarea);
    const propertiesToCopy = [
        'boxSizing',
        'width',
        'height',
        'overflowX',
        'overflowY',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'fontStyle',
        'fontVariant',
        'fontWeight',
        'fontStretch',
        'fontSize',
        'fontSizeAdjust',
        'lineHeight',
        'fontFamily',
        'textAlign',
        'textTransform',
        'textIndent',
        'textDecoration',
        'letterSpacing',
        'wordSpacing',
        'tabSize',
    ] as const;

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';

    for (const property of propertiesToCopy) {
        mirror.style[property] = mirrorStyle[property];
    }

    mirror.textContent = textarea.value.slice(0, caretPosition);

    const marker = document.createElement('span');
    marker.textContent = textarea.value.slice(caretPosition) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const lineHeight = Number.parseFloat(mirrorStyle.lineHeight) || Number.parseFloat(mirrorStyle.fontSize) * 1.4 || 20;
    const position = {
        left: marker.offsetLeft - textarea.scrollLeft,
        top: marker.offsetTop - textarea.scrollTop,
        height: lineHeight,
    };

    document.body.removeChild(mirror);
    return position;
}

function buildSlashCommandSnippet(commandId: Exclude<SlashCommandId, 'image'>) {
    switch (commandId) {
        case 'h1':
            return { text: '# ', caretOffset: 2 };
        case 'h2':
            return { text: '## ', caretOffset: 3 };
        case 'h3':
            return { text: '### ', caretOffset: 4 };
        case 'bullet':
            return { text: '- ', caretOffset: 2 };
        case 'checklist':
            return { text: '- [ ] ', caretOffset: 6 };
        case 'quote':
            return { text: '> ', caretOffset: 2 };
        case 'code':
            return { text: '```ts\n\n```', caretOffset: 6 };
        case 'table':
            return {
                text: '| Cot 1 | Cot 2 |\n| --- | --- |\n| Gia tri 1 | Gia tri 2 |',
                caretOffset: 2,
            };
    }
}

export function ArticleComposer({ titlePage }: PropsWithChildren<{ mode: string; titlePage: string }>) {
    const { theme } = useTheme();
    const [form, setForm] = useState<ArticleFormState>(initialState);
    const [articleMode, setArticleMode] = useState<ArticleMode>('standard');
    const [markdownTab, setMarkdownTab] = useState<MarkdownTab>('write');
    const [attachmentPreviews, setAttachmentPreviews] = useState<AttachmentPreview[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slashMenu, setSlashMenu] = useState<{
        query: string;
        selectedIndex: number;
        position: { left: number; top: number };
        match: SlashCommandMatch;
        items: SlashCommand[];
    } | null>(null);
    const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
    // Dung ref de cleanup object URL luc unmount ma khong bi revoke nham preview con dang hien thi.
    const attachmentPreviewsRef = useRef<AttachmentPreview[]>([]);
    const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const editorSurfaceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        attachmentPreviewsRef.current = attachmentPreviews;
    }, [attachmentPreviews]);

    useEffect(() => {
        return () => {
            for (const preview of attachmentPreviewsRef.current) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, []);

    function replaceAttachments(files: File[]) {
        setAttachmentPreviews((currentPreviews) => {
            const inlinePreviews = currentPreviews.filter((preview) => preview.source === 'inline');
            const mediaPreviews = currentPreviews.filter((preview) => preview.source === 'media');

            // Media upload o panel rieng co vong doi tach biet, thay danh sach moi thi revoke danh sach cu.
            for (const preview of mediaPreviews) {
                URL.revokeObjectURL(preview.url);
            }

            return [
                ...inlinePreviews,
                ...files.map((file) => ({
                    id: buildAttachmentId(file),
                    file,
                    kind: getAttachmentKind(file),
                    source: 'media' as const,
                    url: URL.createObjectURL(file),
                })),
            ];
        });

        setForm((previous) => ({
            ...previous,
            attachments: files,
        }));
    }

    function appendAttachments(files: File[]) {
        if (!files.length) {
            return;
        }

        setAttachmentPreviews((previous) => {
            const existingIds = new Set(previous.map((preview) => preview.id));
            const nextPreviews = files
                .map((file) => ({
                    id: buildAttachmentId(file),
                    file,
                    kind: getAttachmentKind(file),
                    source: 'inline' as const,
                    url: URL.createObjectURL(file),
                }))
                .filter((preview) => {
                    if (existingIds.has(preview.id)) {
                        URL.revokeObjectURL(preview.url);
                        return false;
                    }

                    return true;
                });

            return [...previous, ...nextPreviews];
        });
        setForm((previous) => ({
            ...previous,
            attachments: [...previous.attachments, ...files],
        }));
    }

    function updateContent(nextContent: string) {
        // Giu ham nay toi gian: chi cap nhat text, khong xoa preview inline theo tung lan go phim.
        setForm((previous) => ({
            ...previous,
            content: nextContent,
        }));
    }

    function syncSlashMenu(textarea: HTMLTextAreaElement, contentOverride?: string) {
        if (articleMode !== 'tech' || markdownTab !== 'write') {
            setSlashMenu(null);
            return;
        }

        if (textarea.selectionStart !== textarea.selectionEnd) {
            setSlashMenu(null);
            return;
        }

        const content = contentOverride ?? textarea.value;
        const match = getSlashCommandMatch(content, textarea.selectionStart);
        if (!match) {
            setSlashMenu(null);
            return;
        }

        const items = getMatchingSlashCommands(match.query);
        if (!items.length) {
            setSlashMenu(null);
            return;
        }

        const surface = editorSurfaceRef.current;
        if (!surface) {
            setSlashMenu(null);
            return;
        }

        const textareaRect = textarea.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const caret = getTextareaCaretPosition(textarea, textarea.selectionStart);
        const nextPosition = {
            left: Math.min(
                Math.max(textareaRect.left - surfaceRect.left + caret.left, 16),
                Math.max(surface.clientWidth - 304, 16),
            ),
            top: textareaRect.top - surfaceRect.top + caret.top + caret.height + 10,
        };

        setSlashMenu((previous) => ({
            query: match.query,
            selectedIndex:
                previous && previous.query === match.query ? Math.min(previous.selectedIndex, items.length - 1) : 0,
            position: nextPosition,
            match,
            items,
        }));
    }

    function closeSlashMenu() {
        setSlashMenu(null);
    }

    function applySlashCommand(command: SlashCommand) {
        const textarea = editorTextareaRef.current;
        if (!textarea || !slashMenu) {
            return;
        }

        if (command.id === 'image') {
            closeSlashMenu();
            inlineImageInputRef.current?.click();
            return;
        }

        const snippet = buildSlashCommandSnippet(command.id);
        const nextContent = `${form.content.slice(0, slashMenu.match.from)}${snippet.text}${form.content.slice(slashMenu.match.to)}`;
        const nextCaretPosition = slashMenu.match.from + snippet.caretOffset;

        updateContent(nextContent);
        closeSlashMenu();

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
            syncSlashMenu(textarea, nextContent);
        });
    }

    function handleInlineImageUpload(files: File[]) {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length == 0) {
            return;
        }

        appendAttachments(imageFiles);

        const markdownImages = imageFiles
            .map((file) => {
                const attachmentId = buildAttachmentId(file);
                // `upload://` la token tam thoi de preview local truoc khi backend co URL that.
                return `![${file.name}](upload://${attachmentId})`;
            })
            .join('\n\n');

        setForm((previous) => ({
            ...previous,
            content: previous.content.trim()
                ? `${previous.content.replace(/\s+$/, '')}\n\n${markdownImages}`
                : markdownImages,
        }));
        closeSlashMenu();
        setMarkdownTab('write');
    }

    function resetComposer() {
        setAttachmentPreviews((previous) => {
            for (const preview of previous) {
                URL.revokeObjectURL(preview.url);
            }

            return [];
        });
        setForm(initialState);
        setArticleMode('standard');
        setMarkdownTab('write');
        setStatus(null);
        setError(null);
        closeSlashMenu();
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);
        setError(null);
        setIsSubmitting(true);

        try {
            await articlesApi.create({
                title: form.title,
                content: form.content,
                comunityId: form.comunityId ? Number(form.comunityId) : undefined,
                articleStatus: form.articleStatus,
                attachments: getSubmissionAttachments(attachmentPreviews, form.content),
            });

            setStatus('Da goi tao bai viet thanh cong. Noi dung markdown duoc gui nhu text thong thuong.');
            replaceAttachments([]);
            setForm(initialState);
            setArticleMode('standard');
            setMarkdownTab('write');
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Khong the tao bai viet luc nay.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const isTechArticle = articleMode === 'tech';
    const attachmentMap = new Map(attachmentPreviews.map((preview) => [preview.id, preview]));
    const markdownComponents: Components = {
        img({ src, alt }) {
            const imageSrc = toRenderableImageSrc(src);

            if (imageSrc) {
                // Neu gap anh inline dang dung `upload://...` thi doi sang blob URL tu state local.
                const uploadPreviewId = extractUploadPreviewId(imageSrc);
                const preview = uploadPreviewId ? attachmentMap.get(uploadPreviewId) : null;
                if (preview) {
                    return (
                        <Image
                            src={preview.url}
                            alt={alt ?? preview.file.name}
                            width={1200}
                            height={700}
                            unoptimized
                            className="my-4 max-h-96 w-full rounded-2xl border border-[var(--line)] object-cover"
                        />
                    );
                }
            }

            if (!imageSrc) {
                return null;
            }

            return (
                <Image
                    src={imageSrc}
                    alt={alt ?? ''}
                    width={1200}
                    height={700}
                    unoptimized
                    className="my-4 max-h-96 w-full rounded-2xl border border-[var(--line)] object-cover"
                />
            );
        },
    };

    function isTextareaElement(target: EventTarget | null): target is HTMLTextAreaElement {
        return target instanceof HTMLTextAreaElement;
    }

    return (
        <SectionShell eyebrow="Article Engine" title={titlePage} description="">
            <form
                className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] items-start animate-fade-in-up"
                onSubmit={handleSubmit}
                aria-busy={isSubmitting}
            >
                {/* Left Sidebar Column: Configuration & Controls */}
                <div className="flex flex-col gap-6">
                    {/* Basic Info Card */}
                    <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] relative overflow-hidden">
                        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
                        <div className="space-y-1 relative z-10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">Thông tin bài viết</h3>
                            <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/15">
                                Metadata
                            </span>
                        </div>

                        <div className="grid gap-4 mt-2 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                    Tiêu đề bài viết
                                </label>
                                <Input
                                    placeholder="Ví dụ: Hướng dẫn Next.js toàn tập"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((previous) => ({ ...previous, title: event.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                        Community ID
                                    </label>
                                    <Input
                                        placeholder="Số (ví dụ: 1)"
                                        value={form.comunityId}
                                        onChange={(event) =>
                                            setForm((previous) => ({ ...previous, comunityId: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={form.articleStatus}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                articleStatus: event.target.value as 'Draft' | 'Published',
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                                    >
                                        <option value="Published">Published</option>
                                        <option value="Draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Article Mode Selector Card */}
                    <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">Chế độ viết bài</h3>
                            <p className="text-xs text-[var(--muted)]">
                                Chọn định dạng biên soạn phù hợp với nội dung.
                            </p>
                        </div>
                        <div className="grid gap-3 relative z-10">
                            <button
                                type="button"
                                onClick={() => {
                                    setArticleMode('standard');
                                    setMarkdownTab('write');
                                }}
                                className={`rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                                    articleMode === 'standard'
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md shadow-[var(--accent)]/5'
                                        : 'border-[var(--line)] bg-[var(--background-soft)] hover:bg-[var(--surface)]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg
                                        className={`h-4.5 w-4.5 ${articleMode === 'standard' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                                    </svg>
                                    <p className="text-sm font-bold text-[var(--foreground)]">Standard Article</p>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                    Trình soạn thảo thuần văn bản đơn giản. Thích hợp cho bài đăng xã hội ngắn hoặc cập
                                    nhật thông tin thông thường.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setArticleMode('tech');
                                    setMarkdownTab('write');
                                    setForm((previous) => ({
                                        ...previous,
                                        content: previous.content || starterMarkdown,
                                    }));
                                }}
                                className={`rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                                    articleMode === 'tech'
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md shadow-[var(--accent)]/5'
                                        : 'border-[var(--line)] bg-[var(--background-soft)] hover:bg-[var(--surface)]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg
                                        className={`h-4.5 w-4.5 ${articleMode === 'tech' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                        />
                                    </svg>
                                    <p className="text-sm font-bold text-[var(--foreground)]">
                                        Tech Article (Markdown)
                                    </p>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                    Trình soạn thảo Markdown chuyên nghiệp hỗ trợ code snippet, phím tắt nhanh và live
                                    preview để kiểm tra kỹ bài viết.
                                </p>
                            </button>
                        </div>
                    </Card>

                    {/* Standard Mode Media Attachments Card */}
                    <Card
                        className={`space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] ${articleMode === 'tech' ? 'hidden' : ''}`}
                    >
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">Phương tiện đính kèm</h3>
                            <p className="text-xs text-[var(--muted)]">Đính kèm hình ảnh, video ngắn hoặc ảnh GIF.</p>
                        </div>

                        <Input
                            type="file"
                            multiple
                            accept="image/*,video/*,.gif"
                            onChange={(event) => replaceAttachments(Array.from(event.target.files ?? []))}
                        />

                        {attachmentPreviews.length ? (
                            <div className="rounded-xl border border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-xs text-[var(--muted)]">
                                Đã chọn {attachmentPreviews.length} tệp đính kèm.
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--background-soft)] px-4 py-5 text-xs text-[var(--muted)] text-center">
                                Chưa có tệp tin nào được chọn.
                            </div>
                        )}
                    </Card>

                    {/* Submit Actions Card */}
                    <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] relative overflow-hidden">
                        <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />
                        <div className="space-y-1 relative z-10">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">Hành động</h3>
                        </div>

                        {error ? <FormMessage type="error" message={error} /> : null}
                        {status ? <FormMessage type="success" message={status} /> : null}

                        <div className="grid gap-3 pt-2 relative z-10">
                            <Button
                                type="submit"
                                className="w-full py-3.5 bg-gradient-to-r from-[var(--accent)] to-[#4facfe] hover:from-[var(--accent-strong)] hover:to-[#00f2fe] text-white font-semibold rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    'Đang gửi...'
                                ) : (
                                    <>
                                        <span>
                                            {form.articleStatus === 'Draft' ? 'Lưu bản nháp' : 'Xuất bản bài viết'}
                                        </span>
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full py-3 rounded-full"
                                onClick={resetComposer}
                                disabled={isSubmitting}
                            >
                                Đặt lại biểu mẫu
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Content Editor Workspace */}
                <div className="h-full">
                    <Card className="rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] flex flex-col h-full min-h-[500px]">
                        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4 mb-4">
                            <div className="space-y-1">
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                                    Content Area
                                </span>
                                <h3 className="text-lg font-bold text-[var(--foreground)]">
                                    {isTechArticle ? 'Markdown Workspace' : 'Nội dung bài viết'}
                                </h3>
                            </div>
                            {isTechArticle && (
                                <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">
                                    Gõ / để dùng lệnh nhanh
                                </span>
                            )}
                        </div>

                        {isTechArticle ? (
                            <div className="space-y-4" data-color-mode={theme}>
                                <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                                    {/* Tabs */}
                                    <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setMarkdownTab('write')}
                                                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                                    markdownTab === 'write'
                                                        ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] shadow-sm'
                                                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                                }`}
                                            >
                                                Biên soạn
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMarkdownTab('preview')}
                                                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                                    markdownTab === 'preview'
                                                        ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] shadow-sm'
                                                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                                }`}
                                            >
                                                Xem trước
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline Media Upload Area */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--background-soft)]/50 px-4 py-2 text-xs text-[var(--muted)]">
                                        <button
                                            type="button"
                                            onClick={() => inlineImageInputRef.current?.click()}
                                            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-semibold text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            Chèn ảnh vào bài viết
                                        </button>
                                        <span className="hidden sm:inline italic">
                                            Nhấn đúp vùng Xem trước để quay lại viết bài
                                        </span>
                                    </div>

                                    {markdownTab === 'write' ? (
                                        <div ref={editorSurfaceRef} className="relative">
                                            <MarkdownEditor
                                                value={form.content}
                                                preview="edit"
                                                visibleDragbar={false}
                                                height={400}
                                                previewOptions={{
                                                    components: markdownComponents,
                                                    urlTransform: transformMarkdownUrl,
                                                }}
                                                textareaProps={{
                                                    placeholder:
                                                        'Gõ nội dung markdown, sử dụng phím / để kích hoạt danh sách lệnh nhanh...',
                                                    onFocus: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget);
                                                    },
                                                    onClick: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget);
                                                    },
                                                    onSelect: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget);
                                                    },
                                                    onKeyUp: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget);
                                                    },
                                                    onScroll: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget);
                                                    },
                                                    onBlur: () => {
                                                        window.setTimeout(() => closeSlashMenu(), 120);
                                                    },
                                                    onChange: (event) => {
                                                        if (!isTextareaElement(event.currentTarget)) {
                                                            return;
                                                        }
                                                        editorTextareaRef.current = event.currentTarget;
                                                        syncSlashMenu(event.currentTarget, event.currentTarget.value);
                                                    },
                                                    onKeyDownCapture: (event) => {
                                                        if (!slashMenu) {
                                                            return;
                                                        }

                                                        if (event.key === 'ArrowDown') {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setSlashMenu((previous) =>
                                                                previous
                                                                    ? {
                                                                          ...previous,
                                                                          selectedIndex:
                                                                              (previous.selectedIndex + 1) %
                                                                              previous.items.length,
                                                                      }
                                                                    : previous,
                                                            );
                                                            return;
                                                        }

                                                        if (event.key === 'ArrowUp') {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setSlashMenu((previous) =>
                                                                previous
                                                                    ? {
                                                                          ...previous,
                                                                          selectedIndex:
                                                                              (previous.selectedIndex -
                                                                                  1 +
                                                                                  previous.items.length) %
                                                                              previous.items.length,
                                                                      }
                                                                    : previous,
                                                            );
                                                            return;
                                                        }

                                                        if (event.key === 'Enter' || event.key === 'Tab') {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            applySlashCommand(slashMenu.items[slashMenu.selectedIndex]);
                                                            return;
                                                        }

                                                        if (event.key === 'Escape') {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            closeSlashMenu();
                                                        }
                                                    },
                                                }}
                                                onChange={(value) => updateContent(value ?? '')}
                                            />

                                            {/* Slash command floating dropdown menu */}
                                            {slashMenu ? (
                                                <div
                                                    className="absolute z-20 w-72 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)]"
                                                    style={{
                                                        left: slashMenu.position.left,
                                                        top: slashMenu.position.top,
                                                    }}
                                                >
                                                    <div className="border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                                                        Lệnh nhanh (Slash command)
                                                    </div>
                                                    <div className="max-h-72 overflow-y-auto p-1.5">
                                                        {slashMenu.items.map((command, index) => (
                                                            <button
                                                                key={command.id}
                                                                type="button"
                                                                className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${
                                                                    index === slashMenu.selectedIndex
                                                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                                                        : 'hover:bg-[var(--background-soft)]'
                                                                }`}
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applySlashCommand(command);
                                                                }}
                                                            >
                                                                <span className="text-sm font-bold text-[var(--foreground)]">
                                                                    /{command.id}
                                                                </span>
                                                                <span className="text-xs text-[var(--muted)]">
                                                                    {command.description}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div
                                            className="min-h-[400px] bg-[var(--surface)] px-6 py-6 overflow-y-auto"
                                            onDoubleClick={() => setMarkdownTab('write')}
                                        >
                                            <article className="article-markdown-preview prose prose-indigo max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={markdownComponents}
                                                    urlTransform={transformMarkdownUrl}
                                                >
                                                    {form.content ||
                                                        'Nội dung Markdown của bài viết sẽ hiển thị trực quan ở đây.'}
                                                </ReactMarkdown>
                                            </article>
                                        </div>
                                    )}
                                </div>

                                <input
                                    ref={inlineImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => {
                                        handleInlineImageUpload(Array.from(event.target.files ?? []));
                                        event.target.value = '';
                                    }}
                                />
                            </div>
                        ) : (
                            <Textarea
                                placeholder="Hãy bắt đầu biên soạn câu chuyện của bạn..."
                                value={form.content}
                                onChange={(event) => updateContent(event.target.value)}
                                className="min-h-[400px] flex-grow rounded-2xl resize-y"
                                required
                            />
                        )}
                    </Card>
                </div>
            </form>
        </SectionShell>
    );
}
