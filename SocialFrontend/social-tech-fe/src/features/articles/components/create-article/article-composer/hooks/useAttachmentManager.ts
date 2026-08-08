import { useEffect, useRef, useState } from 'react';
import type { AttachmentPreview } from '../types';
import { buildAttachmentId, getAttachmentKind } from '../utils/attachment.utils';

export function useAttachmentManager() {
    const [attachmentPreviews, setAttachmentPreviews] = useState<AttachmentPreview[]>([]);
    const previewsRef = useRef<AttachmentPreview[]>([]);

    useEffect(() => {
        previewsRef.current = attachmentPreviews;
    }, [attachmentPreviews]);

    useEffect(() => () => {
        for (const preview of previewsRef.current) URL.revokeObjectURL(preview.url);
    }, []);

    function replaceAttachments(files: File[]) {
        setAttachmentPreviews((current) => {
            for (const preview of current.filter((item) => item.source === 'media')) URL.revokeObjectURL(preview.url);
            return [
                ...current.filter((item) => item.source === 'inline'),
                ...files.map((file) => ({ id: buildAttachmentId(file), file, kind: getAttachmentKind(file), source: 'media' as const, url: URL.createObjectURL(file) })),
            ];
        });
    }

    function appendAttachments(files: File[]) {
        if (!files.length) return;
        setAttachmentPreviews((current) => {
            const existingIds = new Set(current.map((preview) => preview.id));
            const next = files.map((file) => ({ id: buildAttachmentId(file), file, kind: getAttachmentKind(file), source: 'inline' as const, url: URL.createObjectURL(file) })).filter((preview) => {
                if (!existingIds.has(preview.id)) return true;
                URL.revokeObjectURL(preview.url);
                return false;
            });
            return [...current, ...next];
        });
    }

    function resetAttachments() {
        setAttachmentPreviews((current) => {
            for (const preview of current) URL.revokeObjectURL(preview.url);
            return [];
        });
    }

    return { attachmentPreviews, replaceAttachments, appendAttachments, resetAttachments };
}
