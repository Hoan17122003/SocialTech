'use client';

import { useState } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/shared/ui/card';
import { SectionShell } from '@/shared/ui/section-shell';
import { useArticleForm } from './article-composer/hooks/useArticleForm';
import { useAttachmentManager } from './article-composer/hooks/useAttachmentManager';
import { AttachmentsCard } from './article-composer/ui/AttachmentsCard';
import { ActionsCard } from './article-composer/ui/ActionsCard';
import { MetadataCard } from './article-composer/ui/MetadataCard';
import { ModeSelectorCard } from './article-composer/ui/ModeSelectorCard';
import { StandardEditor } from './article-composer/ui/StandardEditor';
import { TechEditor } from './article-composer/tech-editor';
import { starterMarkdown } from './article-composer/constants';
import type { ArticleComposerProps, ArticleMode } from './article-composer/types';

export function ArticleComposer({ titlePage }: ArticleComposerProps) {
    const { theme } = useTheme();
    const [articleMode, setArticleMode] = useState<ArticleMode>('standard');
    const attachments = useAttachmentManager();
    const formState = useArticleForm({ attachmentPreviews: attachments.attachmentPreviews, resetAttachments: attachments.resetAttachments, onReset: () => setArticleMode('standard'), onSubmitted: () => setArticleMode('standard') });

    function selectMode(mode: ArticleMode) {
        setArticleMode(mode);
        if (mode === 'tech' && !formState.form.content) formState.updateContent(starterMarkdown);
    }

    return <SectionShell eyebrow="Article Engine" title={titlePage} description="">
        <form className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]" onSubmit={formState.handleSubmit} aria-busy={formState.isSubmitting}>
            <div className="flex flex-col gap-6">
                <MetadataCard form={formState.form} setForm={formState.setForm} />
                <ModeSelectorCard articleMode={articleMode} onChange={selectMode} />
                <AttachmentsCard count={attachments.attachmentPreviews.length} hidden={articleMode === 'tech'} onChange={(files) => { attachments.replaceAttachments(files); formState.setForm((previous) => ({ ...previous, attachments: files })); }} />
                <ActionsCard articleStatus={formState.form.articleStatus} error={formState.error} status={formState.status} isSubmitting={formState.isSubmitting} onReset={formState.resetForm} />
            </div>
            <Card className="flex h-full min-h-[500px] flex-col rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                <div className="mb-4 border-b border-[var(--line)] pb-4"><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">Content Area</span><h3 className="text-lg font-bold text-[var(--foreground)]">{articleMode === 'tech' ? 'Markdown Workspace' : 'Nội dung bài viết'}</h3></div>
                {articleMode === 'tech' ? <TechEditor theme={theme} content={formState.form.content} onChange={formState.updateContent} attachments={attachments.attachmentPreviews} appendAttachments={(files) => { attachments.appendAttachments(files); formState.setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...files] })); }} /> : <StandardEditor value={formState.form.content} onChange={formState.updateContent} />}
            </Card>
        </form>
    </SectionShell>;
}
