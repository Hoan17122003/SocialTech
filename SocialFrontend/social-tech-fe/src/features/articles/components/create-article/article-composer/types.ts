import type { ReactNode } from 'react';

export type ArticleMode = 'standard' | 'tech';
export type MarkdownTab = 'write' | 'preview';
export type AttachmentSource = 'inline' | 'media';
export type SlashCommandId = 'h1' | 'h2' | 'h3' | 'bullet' | 'checklist' | 'quote' | 'code' | 'table' | 'image';

export type SlashCommand = {
    id: SlashCommandId;
    label: string;
    description: string;
    searchTerms: string[];
};

export type SlashCommandMatch = {
    from: number;
    to: number;
    query: string;
};

export type ArticleFormState = {
    title: string;
    content: string;
    comunityId: string;
    articleStatus: 'Draft' | 'Published';
    attachments: File[];
};

export type AttachmentKind = 'image' | 'video' | 'gif' | 'file';

export type AttachmentPreview = {
    id: string;
    file: File;
    kind: AttachmentKind;
    source: AttachmentSource;
    url: string;
};

export type ArticleComposerProps = {
    mode: string;
    titlePage: string;
};

export type MarkdownImageProps = {
    src?: string;
    alt?: string;
};

export type SlashMenuState = {
    query: string;
    selectedIndex: number;
    position: { left: number; top: number };
    match: SlashCommandMatch;
    items: SlashCommand[];
};

export type FallbackContent = ReactNode;
