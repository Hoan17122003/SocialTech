'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';

const navItems = [
    { href: APP_ROUTES.dashboard, label: 'Dashboard' },
    { href: APP_ROUTES.createArticle, label: 'Create Article' },
    { href: '/profile/1', label: 'Profile' },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isHydrated, logout } = useAuth();

    async function handleLogout() {
        await logout();
        router.push(APP_ROUTES.login);
    }

    return (
        <header className="sticky top-4 z-20 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href={APP_ROUTES.home}
                        className="font-mono text-sm uppercase tracking-[0.28em] text-[var(--muted)]"
                    >
                        Social Tech
                    </Link>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        Base structure for App Router, feature modules and shared API layer.
                    </p>
                </div>

                <nav className="flex flex-wrap items-center gap-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-semibold transition',
                                pathname === item.href
                                    ? 'bg-[var(--surface-inverse)] text-white'
                                    : 'border border-[var(--line)] bg-white/70 text-[var(--foreground)]',
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                    {!isHydrated ? (
                        <span
                            aria-hidden="true"
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white opacity-0"
                        >
                            Auth
                        </span>
                    ) : isAuthenticated ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href={APP_ROUTES.login}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                        >
                            Login
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
