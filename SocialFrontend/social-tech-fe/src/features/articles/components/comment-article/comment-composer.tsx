 'use client';

import { useRef, useState } from 'react';
import { RequestWriteComment } from '../../contracts';
import { Card } from '@/shared/ui/card';
import { Textarea } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { AvatarImage } from '@/shared/ui/avatar-image';

type Props = {
    onSubmit: (payload: RequestWriteComment) => Promise<void> | void;
    authorAvatar?: string | null;
    authorName?: string;
};

function CommentComposer({ onSubmit, authorAvatar, authorName }: Props) {
    const [body, setBody] = useState<string>('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    function handleFiles(files: FileList | null) {
        if (!files) return;
        setAttachments((prev) => [...prev, ...Array.from(files)]);
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        if (!body.trim()) return;
        const payload: RequestWriteComment = { body: body.trim(), status: 1, attachments };

        try {
            setIsSubmitting(true);
            await onSubmit(payload);
            setBody('');
            setAttachments([]);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden">
                <AvatarImage src={authorAvatar} alt={authorName ?? 'Author'} fallback={<span className="text-sm font-bold text-[var(--accent)]">{(authorName || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}</span>} />
            </div>

            <form className="flex-1" onSubmit={handleSubmit}>
                <Textarea placeholder="Viết bình luận..." value={body} onChange={(e) => setBody(e.target.value)} />

                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                        <button type="button" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]" onClick={() => fileInputRef.current?.click()}>{attachments.length ? `${attachments.length} tệp` : 'Thêm tệp'}</button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="button" variant="ghost" className="px-4 py-2" onClick={() => { setBody(''); setAttachments([]); }} disabled={isSubmitting}>Hủy</Button>
                        <Button type="submit" disabled={isSubmitting || !body.trim()}>{isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}</Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

export default CommentComposer;
