import { appConfig } from '@/common/config/env';
import { httpClient } from '@/shared/api/http-client';
import type { LoverMediaItem, LoverMediaType } from './contracts';

type RawLoverMedia = Record<string, unknown>;

const MEDIA_PATH_FIELDS = ['url', 'path', 'filePath', 'fileUrl', 'mediaUrl', 'src', 'attachmentUrl'] as const;
const MEDIA_TYPE_FIELDS = ['type', 'fileType', 'mimeType', 'mediaType'] as const;
const MEDIA_TITLE_FIELDS = ['title', 'name', 'fileName', 'originalName'] as const;
const MEDIA_COLLECTION_FIELDS = ['items', 'files', 'media', 'results', 'attachments'] as const;

function readStringField(source: RawLoverMedia, fields: readonly string[]) {
    for (const field of fields) {
        const value = source[field];

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
}

function resolveMediaType(rawType: string, url: string): LoverMediaType | null {
    const typeValue = rawType.toLowerCase();
    const lowerUrl = url.toLowerCase();

    if (
        typeValue.includes('video') ||
        lowerUrl.endsWith('.mp4') ||
        lowerUrl.endsWith('.webm') ||
        lowerUrl.endsWith('.mov') ||
        lowerUrl.endsWith('.m4v')
    ) {
        return 'video';
    }

    if (
        typeValue.includes('image') ||
        lowerUrl.endsWith('.png') ||
        lowerUrl.endsWith('.jpg') ||
        lowerUrl.endsWith('.jpeg') ||
        lowerUrl.endsWith('.gif') ||
        lowerUrl.endsWith('.webp') ||
        lowerUrl.endsWith('.avif')
    ) {
        return 'image';
    }

    return null;
}

function resolveAssetUrl(path: string) {
    if (!path) {
        return '';
    }

    try {
        return new URL(path, appConfig.apiBaseUrl).toString();
    } catch {
        return path;
    }
}

function unwrapCollection(payload: unknown): RawLoverMedia[] {
    // Backend shape may still move while the feature is evolving, so we accept
    // a few common wrapper keys instead of binding the UI to one rigid response.
    if (Array.isArray(payload)) {
        return payload.filter((item): item is RawLoverMedia => typeof item === 'object' && item !== null);
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const record = payload as Record<string, unknown>;

    if ('data' in record) {
        const nested = unwrapCollection(record.data);

        if (nested.length > 0) {
            return nested;
        }
    }

    for (const field of MEDIA_COLLECTION_FIELDS) {
        const nested = unwrapCollection(record[field]);

        if (nested.length > 0) {
            return nested;
        }
    }

    return [];
}

function normalizeLoverMedia(item: RawLoverMedia, index: number): LoverMediaItem | null {
    // Keep the adapter tolerant here so the rendering layer only deals with a
    // stable internal contract: image/video + resolved URL.
    const rawPath = readStringField(item, MEDIA_PATH_FIELDS);
    const url = resolveAssetUrl(rawPath);
    const rawType = readStringField(item, MEDIA_TYPE_FIELDS);
    const type = resolveMediaType(rawType, url);

    if (!url || !type) {
        return null;
    }

    return {
        id: String(item.id ?? item.fileId ?? item.mediaId ?? index),
        type,
        url,
        title: readStringField(item, MEDIA_TITLE_FIELDS) || `Lover media ${index + 1}`,
        rawType,
    };
}

export const handGestureApi = {
    async listLoverMedia() {
        const payload = await httpClient.get<unknown>('/api/lover', {
            auth: true,
        });

        return unwrapCollection(payload)
            .map((item, index) => normalizeLoverMedia(item, index))
            .filter((item): item is LoverMediaItem => item !== null);
    },
};
