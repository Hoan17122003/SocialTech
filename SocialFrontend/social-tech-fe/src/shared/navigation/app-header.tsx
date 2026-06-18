'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { DISPLAYCONTENT } from '@/common/constants/display-const';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { NotificationCenter } from '@/shared/navigation/notifications/notification-center';
import { Authorized, GuestOnly } from '@/shared/components/Authorized';
import { Search } from '@/shared/ui/search';
import { InboxPopover } from '@/features/chat/components/inbox-popover';

const navItems = [
    {
        href: '/news',
        label: 'Tin tuc',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14"
                />
            </svg>
        ),
    },
    {
        href: APP_ROUTES.createArticle,
        label: 'Create Article',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
            </svg>
        ),
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
            </svg>
        ),
    },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { isHydrated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isInboxOpen, setIsInboxOpen] = useState(false);

    async function handleLogout() {
        try {
            await logout();
        } finally {
            router.push(APP_ROUTES.login);
        }
    }

    return (
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[var(--line)] bg-[var(--header-bg)] px-6 shadow-[var(--shadow)] backdrop-blur-md">
            <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href={APP_ROUTES.home}
                        className="flex items-center gap-1.5 border-r border-[var(--line)] pr-3 font-mono text-sm uppercase tracking-[0.28em] text-[var(--muted)] transition-all hover:text-[var(--line-hover)]"
                    >
                        <svg
                            className="h-4 w-4 text-[var(--muted)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        <span>{DISPLAYCONTENT.WEBDISPLAYNAME}</span>
                    </Link>

                    <Authorized>
                        <Search className="hidden sm:block" />
                    </Authorized>
                </div>

                <nav className="flex flex-wrap items-center gap-3">
                    <Authorized>
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95',
                                    pathname === item.href
                                        ? 'bg-[var(--accent)] text-white shadow-md'
                                        : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]',
                                )}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        <NotificationCenter />

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsInboxOpen(!isInboxOpen)}
                                className={cn(
                                    'flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-110 active:scale-95 cursor-pointer',
                                    isInboxOpen
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)]',
                                )}
                            >
                                <span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1 8.38 8.38 0 0 1-5.4-1.9L3 21l2.9-4.1a8.38 8.38 0 0 1-1.9-5.4 8.5 8.5 0 0 1 3.1-6.6 8.38 8.38 0 0 1 5.4-1.9h.5a8.5 8.5 0 0 1 8.5 8.5z" />
                                    </svg>
                                </span>
                                <span>Chat</span>
                            </button>
                            {isInboxOpen && <InboxPopover onClose={() => setIsInboxOpen(false)} />}
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-[var(--accent-strong)] active:scale-95"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Logout
                        </button>
                    </Authorized>

                    <GuestOnly>
                        {!isHydrated ? (
                            <span
                                aria-hidden="true"
                                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white opacity-0"
                            >
                                Auth
                            </span>
                        ) : (
                            <Link
                                href={APP_ROUTES.login}
                                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-[var(--accent-strong)] active:scale-95"
                            >
                                Login
                            </Link>
                        )}
                    </GuestOnly>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="flex cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-sm transition-all hover:scale-110 hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] active:scale-95"
                    >
                        {theme === 'dark' ? (
                            <svg
                                className="h-4.5 w-4.5 fill-amber-400/20 text-amber-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-4.5 w-4.5 fill-indigo-900/10 text-indigo-900"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                />
                            </svg>
                        )}
                    </button>
                </nav>
            </div>
        </header>
    );
}
