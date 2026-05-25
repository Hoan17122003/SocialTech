'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { DISPLAYCONTENT } from '@/common/constants/display-const';
import { Authorized, GuestOnly } from '@/shared/components/Authorized';
import { Search } from '@/shared/ui/search';

export interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'success' | 'warning' | 'article';
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        title: 'Chào mừng bạn đến với Social Tech!',
        description: 'Khám phá Bản tin công nghệ mới và chia sẻ kiến thức của bạn.',
        time: 'Vừa xong',
        isRead: false,
        type: 'info',
    },
    {
        id: '2',
        title: 'Bản tin AI cập nhật',
        description: 'Mô hình Gemini 1.5 Pro vừa hỗ trợ ngữ cảnh lên tới 2M tokens.',
        time: '10 phút trước',
        isRead: false,
        type: 'article',
    },
    {
        id: '3',
        title: 'Hệ thống bảo mật tối ưu',
        description: 'Tài khoản của bạn đã được bảo vệ bằng cơ chế xác thực JWT mới nhất.',
        time: '1 giờ trước',
        isRead: true,
        type: 'success',
    },
    {
        id: '4',
        title: 'Cảnh báo hệ thống',
        description: 'API gateway sẽ được bảo trì định kỳ lúc 02:00 sáng mai.',
        time: '3 giờ trước',
        isRead: true,
        type: 'warning',
    }
];

const navItems = [
    {
        href: '/news',
        label: 'Tin tức',
        icon: (
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
            </svg>
        ),
    },
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

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Initialize notifications from localStorage or defaults
    useEffect(() => {
        const stored = localStorage.getItem('social-tech.notifications');
        if (stored) {
            try {
                setNotifications(JSON.parse(stored));
            } catch (e) {
                setNotifications(DEFAULT_NOTIFICATIONS);
            }
        } else {
            setNotifications(DEFAULT_NOTIFICATIONS);
            localStorage.setItem('social-tech.notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
        }
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveNotifs = (items: NotificationItem[]) => {
        setNotifications(items);
        localStorage.setItem('social-tech.notifications', JSON.stringify(items));
    };

    const handleMarkAllRead = () => {
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        saveNotifs(updated);
    };

    const handleClearAll = () => {
        saveNotifs([]);
    };

    const handleToggleRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = notifications.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n);
        saveNotifs(updated);
    };

    const handleItemClick = (item: NotificationItem) => {
        const updated = notifications.map(n => n.id === item.id ? { ...n, isRead: true } : n);
        saveNotifs(updated);
        if (item.type === 'article' || item.id === '2') {
            router.push('/news');
        }
        setIsNotifOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

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

                        {/* Notification Button & Dropdown */}
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className={cn(
                                    "rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm cursor-pointer relative",
                                    isNotifOpen && "border-[var(--line-hover)] shadow-md"
                                )}
                            >
                                <svg
                                    className={cn("h-4.5 w-4.5 transition-transform duration-300", isNotifOpen && "rotate-12")}
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
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white shadow-sm ring-2 ring-[var(--surface)] animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Card */}
                            {isNotifOpen && (
                                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)] backdrop-blur-lg overflow-hidden z-30 transition-all duration-300 origin-top-right animate-[fade-in-down_0.25s_ease-out]">
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--line)]">
                                        <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                                            <span>Thông báo</span>
                                            {unreadCount > 0 && (
                                                <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                                    {unreadCount} mới
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex gap-2">
                                            {notifications.length > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleMarkAllRead}
                                                        className="text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors cursor-pointer"
                                                    >
                                                        Đọc tất cả
                                                    </button>
                                                    <span className="text-[var(--line)]">|</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAll}
                                                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                                    >
                                                        Xóa hết
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--line)] scrollbar-thin">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                                                <svg className="h-10 w-10 text-[var(--muted)] opacity-40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                                </svg>
                                                <p className="text-xs font-medium text-[var(--muted)]">Hộp thư thông báo trống</p>
                                            </div>
                                        ) : (
                                            notifications.map((item) => {
                                                let iconBg = 'bg-blue-500/10 text-blue-500';
                                                let notifIcon = (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                );

                                                if (item.type === 'success') {
                                                    iconBg = 'bg-emerald-500/10 text-emerald-500';
                                                    notifIcon = (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    );
                                                } else if (item.type === 'warning') {
                                                    iconBg = 'bg-amber-500/10 text-amber-500';
                                                    notifIcon = (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    );
                                                } else if (item.type === 'article') {
                                                    iconBg = 'bg-indigo-500/10 text-indigo-500';
                                                    notifIcon = (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                                                        </svg>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleItemClick(item)}
                                                        className={cn(
                                                            "px-5 py-3.5 flex gap-3.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-all",
                                                            !item.isRead && "bg-[var(--accent)]/[0.02]"
                                                        )}
                                                    >
                                                        <div className={cn("h-8.5 w-8.5 rounded-full flex items-center justify-center shrink-0", iconBg)}>
                                                            {notifIcon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <p className={cn("text-xs leading-normal font-bold text-[var(--foreground)]", !item.isRead ? "opacity-100" : "opacity-80")}>
                                                                    {item.title}
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleToggleRead(item.id, e)}
                                                                    className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] font-semibold shrink-0 cursor-pointer"
                                                                >
                                                                    {item.isRead ? 'Chưa đọc' : 'Đọc'}
                                                                </button>
                                                            </div>
                                                            <p className="text-[11px] text-[var(--muted)] mt-1 font-medium leading-relaxed truncate-2-lines">
                                                                {item.description}
                                                            </p>
                                                            <p className="text-[10px] text-[var(--muted)] opacity-60 mt-1.5 font-mono">
                                                                {item.time}
                                                            </p>
                                                        </div>
                                                        {!item.isRead && (
                                                            <div className="h-2 w-2 rounded-full bg-[var(--accent)] shrink-0 self-center" />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
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
