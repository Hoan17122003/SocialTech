import type { BasicArticle } from '@/features/articles/contracts';

export function getArticleCategory(article: BasicArticle): string {
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    if (['ai', 'gemini', 'gpt', 'machine learning', 'trí tuệ'].some((keyword) => text.includes(keyword))) return 'AI & Machine Learning';
    if (['security', 'token', 'refresh', 'jwt', 'bảo mật', 'auth'].some((keyword) => text.includes(keyword))) return 'Cybersecurity';
    if (['css', 'next.js', 'tailwind', 'react', 'frontend', 'giao diện'].some((keyword) => text.includes(keyword))) return 'Frontend Dev';
    return 'General Tech';
}

export function getAuthorInitials(name?: string) {
    return name ? name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() : 'ST';
}

export function getPlainText(content?: string) {
    return (content || '').replace(/```[\s\S]*?```/g, '').replace(/[#>*_`~\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isImageUrl(url: string) {
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url) || url.includes('images.unsplash.com');
}

export function getImageAttachments(article: BasicArticle) {
    return (article.attachments || []).filter(isImageUrl);
}

export function getFileAttachments(article: BasicArticle) {
    return (article.attachments || []).filter((attachment) => !isImageUrl(attachment));
}

export function getStableMetric(articleId: number, base: number, range: number) {
    return base + Math.abs(articleId * 37) % range;
}
