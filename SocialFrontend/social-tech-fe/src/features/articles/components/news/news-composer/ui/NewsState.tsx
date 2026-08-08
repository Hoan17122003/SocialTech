export function NewsLoading() {
    return <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center gap-4"><div className="relative h-12 w-12"><div className="absolute inset-0 rounded-full border-4 border-[var(--line)]" /><div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[var(--accent)]" /></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Đang tải bảng tin...</p></div>;
}

export function NewsEmptyState() {
    return <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center"><div className="mb-3 text-4xl">🗂️</div><h4 className="text-sm font-bold text-[var(--foreground)]">Không có bài viết phù hợp</h4><p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--muted)]">Thử đổi bộ lọc, xóa từ khóa tìm kiếm hoặc tải lại bảng tin nhé.</p></div>;
}
