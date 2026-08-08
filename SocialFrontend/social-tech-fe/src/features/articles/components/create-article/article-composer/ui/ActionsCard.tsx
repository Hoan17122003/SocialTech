import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { FormMessage } from '@/shared/ui/form-message';

type Props = { articleStatus: 'Draft' | 'Published'; error: string | null; status: string | null; isSubmitting: boolean; onReset: () => void };

export function ActionsCard({ articleStatus, error, status, isSubmitting, onReset }: Props) {
    return <Card className="space-y-4 rounded-[2rem] p-6 border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <h3 className="text-lg font-bold text-[var(--foreground)]">Hành động</h3>
        {error ? <FormMessage type="error" message={error} /> : null}{status ? <FormMessage type="success" message={status} /> : null}
        <div className="grid gap-3"><Button type="submit" className="w-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4facfe] py-3.5 text-white" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi...' : articleStatus === 'Draft' ? 'Lưu bản nháp' : 'Xuất bản bài viết'}</Button><Button type="button" variant="secondary" className="w-full rounded-full py-3" onClick={onReset} disabled={isSubmitting}>Đặt lại biểu mẫu</Button></div>
    </Card>;
}
