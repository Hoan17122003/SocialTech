import Image from 'next/image';
import type { BasicArticle } from '@/features/articles/contracts';
import { getImageAttachments } from '../utils/article.utils';

export function ArticleMedia({ article }: { article: BasicArticle }) {
    const images = getImageAttachments(article);
    if (!images.length) return <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.08))] px-5 py-8 text-center"><div><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">📰</div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Text post</p><p className="mt-1 text-xs text-[var(--muted)]">Bài này chưa có hình ảnh đính kèm.</p></div></div>;
    const visibleImages = images.slice(0, 4);
    return <div className={`grid overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--background-soft)] ${visibleImages.length === 1 ? '' : 'grid-cols-2'}`}>
        {visibleImages.map((image, index) => <a key={image} href={image} target="_blank" rel="noreferrer" className={`group relative block overflow-hidden ${visibleImages.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}`}>
            <Image src={image} alt={`${article.title} - hình ${index + 1}`} fill sizes={visibleImages.length === 1 ? '(max-width: 768px) 100vw, 720px' : '(max-width: 768px) 50vw, 360px'} unoptimized className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            {index === 3 && images.length > 4 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-black text-white">+{images.length - 4}</span>}
        </a>)}
    </div>;
}
