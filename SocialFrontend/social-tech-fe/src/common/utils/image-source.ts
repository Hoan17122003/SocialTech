export function toRenderableImageSrc(value: unknown) {
    // ReactMarkdown and API contracts can pass wider values; UI images only render stable string URLs.
    return typeof value === 'string' ? value.trim() : '';
}
