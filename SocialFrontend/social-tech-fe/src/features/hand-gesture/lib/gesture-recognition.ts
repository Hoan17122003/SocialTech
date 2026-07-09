import type { GestureState, LayoutMode } from '@/features/hand-gesture/feature-hand.types';
import { clamp, distance, lerp, type Point2D } from '@/features/hand-gesture/lib/feature-hand-math';

type FingerState = {
    extendedCount: number;
    fingersExtended: boolean[];
};

function normalizeFingerState(landmarks: Point2D[]): FingerState {
    const wrist = landmarks[0];
    const fingerPairs = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
    ] as const;

    const fingersExtended = fingerPairs.map(([tipIndex, pipIndex]) => {
        const tipDistance = distance(landmarks[tipIndex], wrist);
        const pipDistance = distance(landmarks[pipIndex], wrist);
        return tipDistance > pipDistance + 0.03;
    });

    const thumbExtended = distance(landmarks[4], wrist) > distance(landmarks[3], wrist) + 0.02;

    return {
        fingersExtended,
        extendedCount: fingersExtended.filter(Boolean).length + (thumbExtended ? 1 : 0),
    };
}

export function createInitialGestureState(layout: LayoutMode, gallerySize: number): GestureState {
    return {
        focusIndex: Math.floor(gallerySize / 2),
        galleryScale: 1,
        handDetected: false,
        layout,
        pinchActive: false,
        rotationY: 0,
        tiltX: -0.1,
    };
}

export function detectGestureState(
    landmarks: Point2D[],
    previousLayout: LayoutMode,
    gallerySize: number,
): GestureState {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // These are deliberately simple heuristics: fast enough per frame, easy to tune later.
    const pinchDistance = distance(thumbTip, indexTip);
    const spread =
        (distance(wrist, indexTip) +
            distance(wrist, middleTip) +
            distance(wrist, ringTip) +
            distance(wrist, pinkyTip)) /
        4;
    const centerX = clamp(1 - (wrist.x + indexTip.x + pinkyTip.x) / 3, 0, 1);
    const centerY = clamp((wrist.y + middleTip.y) / 2, 0, 1);
    const { fingersExtended, extendedCount } = normalizeFingerState(landmarks);
    const isOpenPalm = extendedCount >= 4 && spread > 0.34;
    const isFist = extendedCount <= 1 && spread < 0.28;
    const isPeace = fingersExtended[0] && fingersExtended[1] && !fingersExtended[2] && !fingersExtended[3];
    const focusIndex = clamp(Math.round(centerX * Math.max(gallerySize - 1, 0)), 0, Math.max(gallerySize - 1, 0));

    let layout = previousLayout;

    if (isPeace) {
        layout = 'heart';
    } else if (isFist) {
        layout = 'stack';
    } else if (isOpenPalm) {
        layout = 'circle';
    }

    return {
        focusIndex,
        galleryScale: clamp(0.75 + spread * 1.65, 0.82, 1.7),
        handDetected: true,
        layout,
        pinchActive: pinchDistance < 0.055,
        rotationY: lerp(-0.95, 0.95, centerX),
        tiltX: lerp(0.38, -0.42, centerY),
    };
}
