import type { ArticleMode } from '../types';
import { Card } from '@/shared/ui/card';

type Props = { articleMode: ArticleMode; onChange: (mode: ArticleMode) => void };

export function ModeSelectorCard({ articleMode, onChange }: Props) {
    return <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div><h3 className="text-lg font-bold text-[var(--foreground)]">Chế độ viết bài</h3><p className="text-xs text-[var(--muted)]">Chọn định dạng biên soạn phù hợp với nội dung.</p></div>
        {(['standard', 'tech'] as const).map((mode) => <button key={mode} type="button" onClick={() => onChange(mode)} className={`w-full rounded-2xl border p-4 text-left transition ${articleMode === mode ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-[var(--background-soft)] hover:bg-[var(--surface)]'}`}>
            <p className="text-sm font-bold text-[var(--foreground)]">{mode === 'standard' ? 'Standard Article' : 'Tech Article (Markdown)'}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{mode === 'standard' ? 'Trình soạn thảo thuần văn bản đơn giản.' : 'Markdown với code snippet, phím tắt và live preview.'}</p>
        </button>)}
    </Card>;
}
