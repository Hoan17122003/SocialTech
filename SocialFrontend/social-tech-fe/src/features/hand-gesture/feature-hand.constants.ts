import type { LoverMediaItem } from '@/features/hand-gesture/contracts';
import type { LayoutOption } from '@/features/hand-gesture/feature-hand.types';

export const MEDIA_PIPE_VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
export const HAND_LANDMARKER_MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export const LAYOUT_OPTIONS: LayoutOption[] = [
    { label: 'Vong tron', value: 'circle' },
    { label: 'Trai tim', value: 'heart' },
    { label: 'Xep lop', value: 'stack' },
    { label: 'Dai anh', value: 'ribbon' },
];

// Local media keeps the 3D gallery testable when the backend is offline or returns no data.
export const FALLBACK_MEDIA_ASSETS: LoverMediaItem[] = Array.from({ length: 8 }, (_, index) => {
    const numberLabel = String(index + 1).padStart(2, '0');

    return {
        id: `local-fallback-${numberLabel}`,
        title: `Local fallback ${numberLabel}`,
        type: 'image',
        url: `/feature-hand/fallback-${numberLabel}.svg`,
        rawType: 'local-fallback',
    };
});

export const FALLBACK_GALLERY_SIZE = FALLBACK_MEDIA_ASSETS.length;

export const CARD_POSITION_SPEED = 0.05;
export const CARD_ROTATION_SPEED = 0.06;
export const CARD_SCALE_SPEED = 0.06;
export const CARD_OPACITY_SPEED = 0.06;
