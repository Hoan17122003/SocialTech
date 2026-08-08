import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { toRenderableImageSrc } from '@/common/utils/image-source';
import type { AttachmentPreview } from '../types';
import { extractUploadPreviewId } from '../utils/attachment.utils';

type Props = { content: string; attachments: AttachmentPreview[]; onDoubleClick: () => void };

export function ReadMode({ content, attachments, onDoubleClick }: Props) {
    const attachmentMap = new Map(attachments.map((preview) => [preview.id, preview]));
    const components: Components = { img({ src, alt }) {
        const imageSrc = toRenderableImageSrc(src);
        if (!imageSrc) return null;
        const preview = extractUploadPreviewId(imageSrc) ? attachmentMap.get(extractUploadPreviewId(imageSrc)!) : null;
        return <Image src={preview?.url ?? imageSrc} alt={alt ?? preview?.file.name ?? ''} width={1200} height={700} unoptimized className="my-4 max-h-96 w-full rounded-2xl border border-[var(--line)] object-cover" />;
    }};

    return <div className="min-h-[400px] overflow-y-auto bg-[var(--surface)] px-6 py-6" onDoubleClick={onDoubleClick}>
        <article className="article-markdown-preview prose prose-indigo max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={(url) => url}>{content || 'Nội dung Markdown của bài viết sẽ hiển thị trực quan ở đây.'}</ReactMarkdown></article>
    </div>;
}
