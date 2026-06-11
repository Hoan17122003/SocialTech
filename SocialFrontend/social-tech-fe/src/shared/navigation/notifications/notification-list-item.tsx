import { cn } from '@/common/utils/cn';
import type { NotificationItem } from '@/shared/navigation/notifications/notification-center.types';

type NotificationListItemProps = {
    item: NotificationItem;
    onClick: (item: NotificationItem) => void;
    onToggleRead: (id: string) => void;
};

function getNotificationAppearance(type: NotificationItem['type']) {
    switch (type) {
        case 'success':
            return {
                iconBg: 'bg-emerald-500/10 text-emerald-500',
                icon: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            };
        case 'warning':
            return {
                iconBg: 'bg-amber-500/10 text-amber-500',
                icon: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                ),
            };
        case 'article':
            return {
                iconBg: 'bg-indigo-500/10 text-indigo-500',
                icon: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14"
                        />
                    </svg>
                ),
            };
        default:
            return {
                iconBg: 'bg-blue-500/10 text-blue-500',
                icon: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            };
    }
}

export function NotificationListItem({ item, onClick, onToggleRead }: NotificationListItemProps) {
    const { icon, iconBg } = getNotificationAppearance(item.type);

    return (
        <div
            onClick={() => onClick(item)}
            className={cn(
                'flex cursor-pointer gap-3.5 px-5 py-3.5 transition-all hover:bg-[var(--bg-hover)]',
                !item.isRead && 'bg-[var(--accent)]/[0.02]',
            )}
        >
            <div className={cn('flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full', iconBg)}>{icon}</div>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                    <p
                        className={cn(
                            'text-xs font-bold leading-normal text-[var(--foreground)]',
                            !item.isRead ? 'opacity-100' : 'opacity-80',
                        )}
                    >
                        {item.title}
                    </p>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            void onToggleRead(item.id);
                        }}
                        className="shrink-0 cursor-pointer text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                        {item.isRead ? 'Chua doc' : 'Doc'}
                    </button>
                </div>
                <p className="truncate-2-lines mt-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">
                    {item.description}
                </p>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--muted)] opacity-60">{item.time}</p>
            </div>
            {!item.isRead && <div className="h-2 w-2 shrink-0 self-center rounded-full bg-[var(--accent)]" />}
        </div>
    );
}
