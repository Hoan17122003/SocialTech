import type { ArticleFormState } from '../types';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';

type Props = { form: ArticleFormState; setForm: React.Dispatch<React.SetStateAction<ArticleFormState>> };

export function MetadataCard({ form, setForm }: Props) {
    return <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <h3 className="text-lg font-bold text-[var(--foreground)]">Thông tin bài viết</h3>
        <div className="grid gap-4">
            <label className="space-y-1.5 text-xs font-semibold text-[var(--foreground)]">Tiêu đề bài viết
                <Input placeholder="Ví dụ: Hướng dẫn Next.js toàn tập" value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-[var(--foreground)]">Community ID
                    <Input placeholder="Số (ví dụ: 1)" value={form.comunityId} onChange={(event) => setForm((previous) => ({ ...previous, comunityId: event.target.value }))} />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-[var(--foreground)]">Trạng thái
                    <select value={form.articleStatus} onChange={(event) => setForm((previous) => ({ ...previous, articleStatus: event.target.value as ArticleFormState['articleStatus'] }))} className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]">
                        <option value="Published">Published</option><option value="Draft">Draft</option>
                    </select>
                </label>
            </div>
        </div>
    </Card>;
}
