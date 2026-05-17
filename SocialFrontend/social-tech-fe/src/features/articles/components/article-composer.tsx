'use client';

import dynamic from 'next/dynamic';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { ApiError } from '@/common/types/api';
import { articlesApi } from '@/features/articles/articles-api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input, Textarea } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';
import { SectionShell } from '@/shared/ui/section-shell';

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
            if (typeof src === 'string') {
                // Neu gap anh inline dang dung `upload://...` thi doi sang blob URL tu state local.
                const uploadPreviewId = extractUploadPreviewId(src);
                const preview = uploadPreviewId ? attachmentMap.get(uploadPreviewId) : null;
                if (preview) {
                    return (
                        <img
                            src={preview.url}
                            alt={alt ?? preview.file.name}
                            className="my-4 max-h-96 w-full rounded-2xl border border-[var(--line)] object-cover"
                        />
                    );
                }
            }

            return (
                <img
                    src={src ?? ''}
                    alt={alt ?? ''}
                    className="my-4 max-h-96 w-full rounded-2xl border border-[var(--line)] object-cover"
                />
            );
        },
    };

    function isTextareaElement(target: EventTarget | null): target is HTMLTextAreaElement {
        return target instanceof HTMLTextAreaElement;
    }

    return (
        <SectionShell eyebrow="Article" title={titlePage} description="">
            <div className="relative">
                <form
                    className="grid gap-6"
                    onSubmit={handleSubmit}
                    aria-busy={isSubmitting}
                >
                <Card className="space-y-5 rounded-[1.75rem] p-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                            Basic info
                        </p>
                        <h3 className="text-xl font-semibold">Thông tin bài viết</h3>
                        {/* <p className="text-sm leading-6 text-[var(--muted)]">
                            Cac truong nay duoc giu chung cho ca bai viet thuong va tech article.
                        </p> */}
                    </div>

                    <div className="grid gap-4">
                        <Input
                            placeholder="Tiêu đề bài viết"
                            value={form.title}
                            onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                placeholder="Community Id"
                                value={form.comunityId}
                                onChange={(event) =>
                                    setForm((previous) => ({ ...previous, comunityId: event.target.value }))
                                }
                            />
                            <select
                                value={form.articleStatus}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        articleStatus: event.target.value as 'Draft' | 'Published',
                                    }))
                                }
                                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                            >
                                <option value="Published">Published</option>
                                <option value="Draft">Draft</option>
                            </select>
                        </div>
                    </div>
                </Card>
                <Card className="space-y-5 rounded-[1.75rem] p-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                            Article mode
                        </p>
                        <h3 className="text-xl font-semibold">Chọn cách viết bài</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                setArticleMode('standard');
                                setMarkdownTab('write');
                            }}
                            className={`rounded-[1.5rem] border px-5 py-4 text-left transition ${
                                articleMode === 'standard'
                                    ? 'border-[var(--accent)] bg-[rgba(204,95,61,0.12)]'
                                    : 'border-[var(--line)] bg-white/65 hover:bg-white'
                            }`}
                        >
                            <p className="text-sm font-semibold">Standard article</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                Dùng cho content editor đơn gian, phù hợp với bài viết ngắn dạng sosial life hoặc update
                                thông thường
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
                            className={`rounded-[1.5rem] border px-5 py-4 text-left transition ${
                                articleMode === 'tech'
                                    ? 'border-[var(--accent)] bg-[rgba(204,95,61,0.12)]'
                                    : 'border-[var(--line)] bg-white/65 hover:bg-white'
                            }`}
                        >
                            <p className="text-sm font-semibold">Tech article</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                Hiển thị markdown editor, media upload và chế độ preview để kiểm tra toàn bộ bài viết.
                            </p>
                        </button>
                    </div>
                </Card>
                <Card className="space-y-5 rounded-[1.75rem] p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                                Content
                            </p>
                            <h3 className="text-xl font-semibold">
                                {isTechArticle ? 'Markdown editor' : 'Noi dung bai viet'}
                            </h3>
                        </div>
                    </div>

                    {isTechArticle ? (
                        <div className="space-y-4" data-color-mode="light">
                            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-white/75">
                                <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMarkdownTab('write')}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                markdownTab === 'write'
                                                    ? 'bg-[var(--accent)] text-white'
                                                    : 'bg-[var(--background-soft)] text-[var(--muted)] hover:bg-white'
                                            }`}
                                        >
                                            Write
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMarkdownTab('preview')}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                markdownTab === 'preview'
                                                    ? 'bg-[var(--accent)] text-white'
                                                    : 'bg-[var(--background-soft)] text-[var(--muted)] hover:bg-white'
                                            }`}
                                        >
                                            Preview
                                        </button>
                                    </div>

                                    {/* <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                                        <span className="rounded-full bg-[var(--background-soft)] px-3 py-1.5">
                                            `#` heading
                                        </span>
                                        <span className="rounded-full bg-[var(--background-soft)] px-3 py-1.5">
                                            `-` list
                                        </span>
                                        <span className="rounded-full bg-[var(--background-soft)] px-3 py-1.5">
                                            ``` code ```
                                        </span>
                                        <span className="rounded-full bg-[var(--background-soft)] px-3 py-1.5">
                                            `![alt](url)` image
                                        </span>
                                    </div> */}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                                    <button
                                        type="button"
                                        onClick={() => inlineImageInputRef.current?.click()}
                                        className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
                                    >
                                        Chèn ảnh vào nội dung
                                    </button>
                                    <span className="rounded-full border border-dashed border-[var(--line)] px-3 py-1.5">
                                        Double click khu preview để quay lại chế độ Write
                                    </span>
                                </div>

                                {markdownTab === 'write' ? (
                                    <div ref={editorSurfaceRef} className="relative">
                                        <MarkdownEditor
                                            value={form.content}
                                            preview="edit"
                                            visibleDragbar={false}
                                            height={460}
                                            // Dong bo cach render inline image cho live preview/code preview cua editor.
                                            previewOptions={{
                                                components: markdownComponents,
                                                urlTransform: transformMarkdownUrl,
                                            }}
                                            textareaProps={{
                                                placeholder:
                                                    'Mo ta thay doi, ghi chu ky thuat, checklist, snippets... giong khu vuc description trong GitHub PR.',
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

                                        {slashMenu ? (
                                            <div
                                                className="absolute z-20 w-72 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)]"
                                                style={{
                                                    left: slashMenu.position.left,
                                                    top: slashMenu.position.top,
                                                }}
                                            >
                                                <div className="border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                                                    Slash command
                                                </div>
                                                <div className="max-h-72 overflow-y-auto p-2">
                                                    {slashMenu.items.map((command, index) => (
                                                        <button
                                                            key={command.id}
                                                            type="button"
                                                            className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${
                                                                index === slashMenu.selectedIndex
                                                                    ? 'bg-[rgba(204,95,61,0.14)]'
                                                                    : 'hover:bg-[var(--background-soft)]'
                                                            }`}
                                                            onMouseDown={(event) => {
                                                                event.preventDefault();
                                                                applySlashCommand(command);
                                                            }}
                                                        >
                                                            <span className="text-sm font-semibold text-[var(--foreground)]">
                                                                /{command.id}
                                                            </span>
                                                            <span className="text-sm text-[var(--muted)]">
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
                                        className="min-h-[460px] bg-white/70 px-5 py-5"
                                        onDoubleClick={() => setMarkdownTab('write')}
                                    >
                                        <article className="article-markdown-preview">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={markdownComponents}
                                                urlTransform={transformMarkdownUrl}
                                            >
                                                {form.content || 'Noi dung markdown se duoc render o day.'}
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
                            placeholder="Nội dung bài viết"
                            value={form.content}
                            onChange={(event) => updateContent(event.target.value)}
                        />
                    )}
                </Card>{' '}
                <Card className={`space-y-5 rounded-[1.75rem] p-5 ${articleMode === 'tech' ? 'hidden' : ''}`}>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Media</p>
                        <h3 className="text-xl font-semibold">Đính kèm image, video và gif</h3>
                    </div>

                    <Input
                        type="file"
                        multiple
                        accept="image/*,video/*,.gif"
                        onChange={(event) => replaceAttachments(Array.from(event.target.files ?? []))}
                    />

                    {attachmentPreviews.length ? (
                        <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
                            Đã chọn {attachmentPreviews.length} tệp đính kèm.
                        </div>
                    ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--background-soft)] px-5 py-6 text-sm text-[var(--muted)]">
                            Chưa có attachments nào được chọn.
                        </div>
                    )}
                </Card>
                <Card className="space-y-4 rounded-[1.75rem] p-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Submit</p>
                        <h3 className="text-xl font-semibold">Hành động</h3>
                    </div>

                    {error ? <FormMessage type="error" message={error} /> : null}
                    {status ? <FormMessage type="success" message={status} /> : null}

                    <div className="flex flex-col gap-3 md:ml-auto md:w-auto md:min-w-52">
                        <Button type="button" variant="secondary" onClick={resetComposer} disabled={isSubmitting}>
                            Đặt lại form
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang gửi...' : form.articleStatus === 'Draft' ? 'Lưu nháp' : 'Đăng bài'}
                        </Button>
                    </div>
                </Card>
                </form>
            </div>
        </SectionShell>
    );
}
