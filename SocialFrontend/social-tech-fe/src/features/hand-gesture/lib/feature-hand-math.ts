export type Point2D = {
    x: number;
    y: number;
};

export function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function distance(a: Point2D, b: Point2D) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lerp(start: number, end: number, alpha: number) {
    return start + (end - start) * alpha;
}
