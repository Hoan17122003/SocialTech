import type { AttachmentKind, AttachmentPreview } from '../types';

export function getAttachmentKind(file: File): AttachmentKind {
    if (file.type === 'image/gif') return 'gif';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
}

export function buildAttachmentId(file: File) {
    const safeName = file.name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return `${safeName || 'file'}-${file.lastModified}-${file.size}`;
}

export function extractInlineUploadIds(content: string) {
    return new Set(Array.from(content.matchAll(/upload:\/\/([a-z0-9-]+)/gi), (match) => match[1]).filter(Boolean));
}

export function extractUploadPreviewId(src: string) {
    const normalizedSrc = [src, decodeURIComponent(src)]
        .map((value) => value.trim().replace(/^<|>$/g, ''))
        .find(Boolean);
    return normalizedSrc?.match(/upload:\/\/([a-z0-9-]+)/i)?.[1] ?? null;
}

export function getSubmissionAttachments(previews: AttachmentPreview[], content: string) {
    const inlineIds = extractInlineUploadIds(content);
    return previews.filter((preview) => preview.source === 'media' || inlineIds.has(preview.id)).map((preview) => preview.file);
}
