import { useState } from 'react';
import type { AttachmentPreview } from '../types';
import { ReadMode } from './ReadMode';
import { WriteMode } from './WriteMode';

type Props = { theme: 'light' | 'dark'; content: string; onChange: (content: string) => void; attachments: AttachmentPreview[]; appendAttachments: (files: File[]) => void };

export function TechEditor({ theme, content, onChange, attachments, appendAttachments }: Props) {
    const [tab, setTab] = useState<'write' | 'preview'>('write');
    return <div className="space-y-4" data-color-mode={theme}>
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-2"><div className="flex gap-1.5">{(['write', 'preview'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl px-4 py-1.5 text-xs font-bold ${tab === item ? 'bg-[var(--surface)] text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{item === 'write' ? 'Biên soạn' : 'Xem trước'}</button>)}</div></div>
            {tab === 'write' ? <WriteMode content={content} onChange={onChange} appendAttachments={appendAttachments} attachments={attachments} /> : <ReadMode content={content} attachments={attachments} onDoubleClick={() => setTab('write')} />}
        </div>
    </div>;
}
