'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';
import { DISPLAYCONTENT } from '@/common/constants/display-const';
import { Authorized, GuestOnly } from '@/shared/components/Authorized';
import { Search } from '@/shared/ui/search';

const navItems = [
    { href: APP_ROUTES.createArticle, label: 'Create Article', isAuth: true },
    { href: '/profile', label: 'Profile', isAuth: true },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { isHydrated, logout } = useAuth();

    async function handleLogout() {
        try {
            await logout();
        } finally {
            router.push(APP_ROUTES.login);
        }
    }

    return (
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm flex items-center h-16 px-6">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href={APP_ROUTES.home}
                        className="font-mono border-r border-gray-300 pr-3 text-sm uppercase tracking-[0.28em] text-[var(--muted)]"
                    >
                        {DISPLAYCONTENT.WEBDISPLAYNAME}
                    </Link>

                    <Authorized>
                        <Search className="hidden sm:block" />
                    </Authorized>
                </div>

                <nav className="flex flex-wrap items-center gap-2">
                    <Authorized>
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                                    pathname === item.href
                                        ? 'bg-[var(--surface-inverse)] text-white'
                                        : 'border border-[var(--line)] bg-white/70 text-[var(--foreground)] hover:bg-[rgba(24,35,47,0.04)]',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                        >
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
                                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                            >
                                Login
                            </Link>
                        )}
                    </GuestOnly>
                </nav>
            </div>
        </header>
    );
}
