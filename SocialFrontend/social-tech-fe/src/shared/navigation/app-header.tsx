'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { DISPLAYCONTENT } from '@/common/constants/display-const';
import { Authorized, GuestOnly } from '@/shared/components/Authorized';
import { Search } from '@/shared/ui/search';

const navItems = [
    {
        href: APP_ROUTES.createArticle,
        label: 'Create Article',
        icon: (
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: (
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { isHydrated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    async function handleLogout() {
        try {
            await logout();
        } finally {
            router.push(APP_ROUTES.login);
        }
    }

    return (
        <header className="sticky top-0 z-20 bg-[var(--header-bg)] border-b border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-md flex items-center h-16 px-6">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href={APP_ROUTES.home}
                        className="font-mono border-r border-[var(--line)] pr-3 text-sm uppercase tracking-[0.28em] text-[var(--muted)] hover:text-[var(--line-hover)] transition-all flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
                                    'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center',
                                    pathname === item.href
                                        ? 'bg-[var(--accent)] text-white shadow-md'
                                        : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]',
                                )}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95 flex items-center gap-1"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
                                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95"
                            >
                                Login
                            </Link>
                        )}
                    </GuestOnly>

                    {/* Theme Toggle Button */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm cursor-pointer"
                    >
                        {theme === 'dark' ? (
                            <svg
                                className="h-4.5 w-4.5 text-amber-400 fill-amber-400/20"
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
                                className="h-4.5 w-4.5 text-indigo-900 fill-indigo-900/10"
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
