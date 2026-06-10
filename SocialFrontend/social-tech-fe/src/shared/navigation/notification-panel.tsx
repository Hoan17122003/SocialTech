import type { NotificationItem } from '@/shared/navigation/notification-center.types';
import { NotificationListItem } from '@/shared/navigation/notification-list-item';

type NotificationPanelProps = {
    items: NotificationItem[];
    isOpen: boolean;
    onClearAll: () => void;
    onItemClick: (item: NotificationItem) => void;
    onMarkAllRead: () => void;
    onToggleRead: (id: string) => Promise<void>;
    unreadCount: number;
};

export function NotificationPanel({
    isOpen,
    items,
    onClearAll,
    onItemClick,
    onMarkAllRead,
    onToggleRead,
    unreadCount,
}: NotificationPanelProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="absolute right-0 z-30 mt-3 w-80 origin-top-right overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)] backdrop-blur-lg transition-all duration-300 animate-[fade-in-down_0.25s_ease-out] sm:w-96">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />

            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 pb-3 pt-4">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                    <span>Thong bao</span>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            {unreadCount} moi
                        </span>
                    )}
                </h3>

                <div className="flex gap-2">
                    {items.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={onMarkAllRead}
                                className="cursor-pointer text-[11px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                            >
                                Doc tat ca
                            </button>
                            <span className="text-[var(--line)]">|</span>
                            <button
                                type="button"
                                onClick={onClearAll}
                                className="cursor-pointer text-[11px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
                            >
                                Xoa het
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="scrollbar-thin max-h-[360px] overflow-y-auto divide-y divide-[var(--line)]">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                        <svg
                            className="mb-3 h-10 w-10 text-[var(--muted)] opacity-40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                            />
                        </svg>
                        <p className="text-xs font-medium text-[var(--muted)]">Hop thu thong bao trong</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <NotificationListItem key={item.id} item={item} onClick={onItemClick} onToggleRead={onToggleRead} />
                    ))
                )}
            </div>
        </div>
    );
}
