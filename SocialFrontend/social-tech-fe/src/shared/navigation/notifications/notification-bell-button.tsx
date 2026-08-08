import { cn } from '@/common/utils/cn';

type NotificationBellButtonProps = {
    isOpen: boolean;
    onClick: () => void;
    unreadCount: number;
};

export function NotificationBellButton({ isOpen, onClick, unreadCount }: NotificationBellButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-sm transition-all hover:scale-110 hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] active:scale-95',
                isOpen && 'border-[var(--line-hover)] shadow-md',
            )}
        >
            <svg
                className={cn('h-4.5 w-4.5 transition-transform duration-300', isOpen && 'rotate-12')}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
            </svg>
            {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white shadow-sm ring-2 ring-[var(--surface)]">
                    {unreadCount}
                </span>
            )}
        </button>
    );
}
