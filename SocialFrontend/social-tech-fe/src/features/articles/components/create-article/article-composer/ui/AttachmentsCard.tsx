import { Input } from '@/shared/ui/field';
import { Card } from '@/shared/ui/card';

type Props = { count: number; onChange: (files: File[]) => void; hidden: boolean };

export function AttachmentsCard({ count, onChange, hidden }: Props) {
    return <Card className={`space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] ${hidden ? 'hidden' : ''}`}>
        <div><h3 className="text-lg font-bold text-[var(--foreground)]">Phương tiện đính kèm</h3><p className="text-xs text-[var(--muted)]">Đính kèm hình ảnh, video ngắn hoặc ảnh GIF.</p></div>
        <Input type="file" multiple accept="image/*,video/*,.gif" onChange={(event) => onChange(Array.from(event.target.files ?? []))} />
        <div className="rounded-xl border border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-xs text-[var(--muted)]">{count ? `Đã chọn ${count} tệp đính kèm.` : 'Chưa có tệp tin nào được chọn.'}</div>
    </Card>;
}
