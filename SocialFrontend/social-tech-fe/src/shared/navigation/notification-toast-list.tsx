import type { ToastNotification } from '@/shared/navigation/notification-center.types';

type NotificationToastListProps = {
    items: ToastNotification[];
    onClick: (toast: ToastNotification) => void;
};

export function NotificationToastList({ items, onClick }: NotificationToastListProps) {
    return (
        <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
            {items.map((toast) => (
                <button
                    key={toast.toastId}
                    type="button"
                    onClick={() => onClick(toast)}
                    className="pointer-events-auto w-full overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left shadow-[var(--shadow)] backdrop-blur-lg transition hover:-translate-y-0.5 hover:border-[var(--line-hover)]"
                >
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">{toast.title}</p>
                            <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                                {toast.description || 'Ban co thong bao moi.'}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                            new
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-[var(--muted)] opacity-80">{toast.time}</p>
                        <span className="text-[11px] font-semibold text-[var(--accent)]">Xem ngay</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
