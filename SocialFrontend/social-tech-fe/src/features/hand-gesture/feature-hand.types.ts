export type LayoutMode = 'circle' | 'heart' | 'stack' | 'ribbon';

export type GestureState = {
    focusIndex: number | null;
    galleryScale: number;
    handDetected: boolean;
    layout: LayoutMode;
    pinchActive: boolean;
    rotationY: number;
    tiltX: number;
};

export type LayoutOption = {
    label: string;
    value: LayoutMode;
};
