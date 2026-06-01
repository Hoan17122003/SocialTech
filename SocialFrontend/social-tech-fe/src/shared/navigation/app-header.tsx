'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { DISPLAYCONTENT } from '@/common/constants/display-const';
import { cn } from '@/common/utils/cn';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { createNotificationHubConnection } from '@/shared/api/realtime-client';
import { Authorized, GuestOnly } from '@/shared/components/Authorized';
import { Search } from '@/shared/ui/search';

export interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'success' | 'warning' | 'article';
    href?: string | null;
}

type SignalRNotificationPayload = {
    id?: string | number;
    title?: string | null;
    description?: string | null;
    message?: string | null;
    content?: string | null;
    body?: string | null;
    time?: string | null;
    createdAt?: string | null;
    sentAt?: string | null;
    timestamp?: string | null;
    isRead?: boolean | null;
    type?: string | null;
    category?: string | null;
    kind?: string | null;
    href?: string | null;
    url?: string | null;
    link?: string | null;
};

type NotificationHubConnection = ReturnType<typeof createNotificationHubConnection>;
type ToastNotification = NotificationItem & { toastId: string };

const NOTIFICATION_STORAGE_KEY = 'social-tech.notifications';

const navItems = [
    {
        href: '/news',
        label: 'Tin tức',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
            </svg>
        ),
    },
    {
        href: APP_ROUTES.createArticle,
        label: 'Create Article',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: (
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

function formatNotificationTime(value?: string | null) {
    if (!value) {
        return 'Vừa xong';
    }

    const createdAt = new Date(value);

    if (Number.isNaN(createdAt.getTime())) {
        return value;
    }

    const diffMs = createdAt.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 1) {
        return 'Vừa xong';
    }

    if (Math.abs(diffMinutes) < 60) {
        return formatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (Math.abs(diffHours) < 24) {
        return formatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return formatter.format(diffDays, 'day');
}

function mapNotificationType(value?: string | null): NotificationItem['type'] {
    switch (value?.toLowerCase()) {
        case 'success':
            return 'success';
        case 'warning':
        case 'warn':
            return 'warning';
        case 'article':
        case 'news':
            return 'article';
        default:
            return 'info';
    }
}

function createNotificationId(value?: string | number) {
    if (value !== undefined && value !== null) {
        return String(value);
    }

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()}`;
}

function toNotificationItem(payload: SignalRNotificationPayload): NotificationItem {
    const createdAt = payload.createdAt ?? payload.sentAt ?? payload.timestamp;
    const type = mapNotificationType(payload.type ?? payload.category ?? payload.kind);

    return {
        id: createNotificationId(payload.id),
        title: payload.title?.trim() || 'Thông báo mới',
        description: payload.description?.trim() || payload.message?.trim() || payload.content?.trim() || payload.body?.trim() || '',
        time: payload.time?.trim() || formatNotificationTime(createdAt),
        isRead: Boolean(payload.isRead),
        type,
        href: payload.href ?? payload.url ?? payload.link ?? (type === 'article' ? '/news' : null),
    };
}

function readStoredNotifications() {
    if (typeof window === 'undefined') {
        return [] as NotificationItem[];
    }

    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);

    if (!stored) {
        return [] as NotificationItem[];
    }

    try {
        return JSON.parse(stored) as NotificationItem[];
    } catch {
        return [];
    }
}

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { accessToken, isHydrated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [notifications, setNotifications] = useState<NotificationItem[]>(() => readStoredNotifications());
    const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const connectionRef = useRef<NotificationHubConnection | null>(null);

    useEffect(() => {
        if (!isHydrated || !accessToken || typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }

        if (window.Notification.permission === 'default') {
            void window.Notification.requestPermission().catch(() => undefined);
        }
    }, [accessToken, isHydrated, router]);

    useEffect(() => {
        if (!isHydrated || !accessToken) {
            return;
        }

        const connection = createNotificationHubConnection();
        connectionRef.current = connection;
        let isDisposed = false;

        const showToastNotification = (notification: NotificationItem) => {
            const toastId = `${notification.id}-${Date.now()}`;
            const toast: ToastNotification = { ...notification, toastId };

            setToastNotifications((current) => [toast, ...current].slice(0, 3));

            const timeoutId = setTimeout(() => {
                setToastNotifications((current) => current.filter((item) => item.toastId !== toastId));
                toastTimeoutsRef.current.delete(toastId);
            }, 4500);

            toastTimeoutsRef.current.set(toastId, timeoutId);
        };

        const showBrowserNotification = (notification: NotificationItem) => {
            if (typeof window === 'undefined' || !('Notification' in window)) {
                return;
            }

            if (window.Notification.permission !== 'granted') {
                return;
            }

            try {
                const browserNotification = new window.Notification(notification.title, {
                    body: notification.description,
                    tag: notification.id,
                });

                browserNotification.onclick = () => {
                    window.focus();
                    if (notification.href) {
                        router.push(notification.href);
                    }
                    browserNotification.close();
                };
            } catch (error) {
                console.warn('Failed to show browser notification.', error);
            }
        };

        const saveIncomingNotification = (payload: SignalRNotificationPayload) => {
            const nextNotification = toNotificationItem(payload);

            setNotifications((current) => {
                const nextItems = [nextNotification, ...current.filter((item) => item.id !== nextNotification.id)];
                localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(nextItems));
                return nextItems;
            });

            showToastNotification(nextNotification);
            showBrowserNotification(nextNotification);
        };

        const handleNotificationsRead = (notificationIds: Array<string | number>) => {
            const readIds = new Set(notificationIds.map((notificationId) => String(notificationId)));
            setNotifications((current) => {
                const nextItems = current.map((item) =>
                    readIds.has(item.id) ? { ...item, isRead: true } : item,
                );
                localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(nextItems));
                return nextItems;
            });
        };

        connection.on('notificationReceived', saveIncomingNotification);
        connection.on('notificationsRead', handleNotificationsRead);

        async function startConnection(hubConnection: NotificationHubConnection) {
            try {
                await hubConnection.start();
                const initialNotifications = (await hubConnection.invoke(
                    'GetMyNotifications',
                )) as SignalRNotificationPayload[];

                if (isDisposed) {
                    return;
                }

                const nextItems = initialNotifications.map((payload) => toNotificationItem(payload));
                setNotifications(nextItems);
                localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(nextItems));
            } catch (error: unknown) {
                console.error('Failed to connect to notification hub.', error);
            }
        }

        void startConnection(connection);

        return () => {
            isDisposed = true;
            connection.off('notificationReceived', saveIncomingNotification);
            connection.off('notificationsRead', handleNotificationsRead);
            if (connectionRef.current === connection) {
                connectionRef.current = null;
            }

            void connection.stop().catch((error: unknown) => {
                console.error('Failed to stop notification hub connection.', error);
            });
        };
    }, [accessToken, isHydrated, router]);

    useEffect(() => {
        const toastTimeouts = toastTimeoutsRef.current;

        return () => {
            toastTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
            toastTimeouts.clear();
        };
    }, []);

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
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
    };

    const dismissToast = (toastId: string) => {
        const timeoutId = toastTimeoutsRef.current.get(toastId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            toastTimeoutsRef.current.delete(toastId);
        }

        setToastNotifications((current) => current.filter((item) => item.toastId !== toastId));
    };

    const markNotificationsAsRead = async (notificationIds: number[]) => {
        if (notificationIds.length === 0) {
            return;
        }

        try {
            const connection = connectionRef.current;
            if (!connection) {
                return;
            }

            await connection.invoke('MarkNotificationAsRead', notificationIds);
        } catch (error) {
            console.error('Failed to mark notifications as read.', error);
        }
    };

    const handleMarkAllRead = async () => {
        const unreadNotificationIds = notifications
            .filter((item) => !item.isRead)
            .map((item) => Number(item.id));

        await markNotificationsAsRead(unreadNotificationIds);

        const updated = notifications.map((item) => ({ ...item, isRead: true }));
        saveNotifs(updated);
    };

    const handleClearAll = () => {
        saveNotifs([]);
    };

    const handleToggleRead = async (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        const targetNotification = notifications.find((item) => item.id === id);
        if (targetNotification && !targetNotification.isRead) {
            await markNotificationsAsRead([Number(id)]);
        }

        const updated = notifications.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item));
        saveNotifs(updated);
    };

    const handleNotificationPanelToggle = async () => {
        const nextIsOpen = !isNotifOpen;
        setIsNotifOpen(nextIsOpen);

        if (!nextIsOpen) {
            return;
        }

        const unreadNotificationIds = notifications
            .filter((item) => !item.isRead)
            .map((item) => Number(item.id));

        await markNotificationsAsRead(unreadNotificationIds);

        if (unreadNotificationIds.length > 0) {
            const updated = notifications.map((item) => ({ ...item, isRead: true }));
            saveNotifs(updated);
        }
    };

    const handleItemClick = (item: NotificationItem) => {
        const updated = notifications.map((notification) =>
            notification.id === item.id ? { ...notification, isRead: true } : notification,
        );

        saveNotifs(updated);

        if (item.href) {
            router.push(item.href);
        }

        setIsNotifOpen(false);
    };

    const displayNotifications = isHydrated ? notifications : [];
    const unreadCount = displayNotifications.filter((item) => !item.isRead).length;

    async function handleLogout() {
        try {
            await logout();
        } finally {
            router.push(APP_ROUTES.login);
        }
    }

    return (
        <>
            <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
                {toastNotifications.map((toast) => (
                    <button
                        key={toast.toastId}
                        type="button"
                        onClick={() => {
                            dismissToast(toast.toastId);
                            handleItemClick(toast);
                        }}
                        className="pointer-events-auto w-full overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left shadow-[var(--shadow)] backdrop-blur-lg transition hover:-translate-y-0.5 hover:border-[var(--line-hover)]"
                    >
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-[var(--foreground)]">{toast.title}</p>
                                <p className="mt-1 text-xs font-medium text-[var(--muted)]">{toast.description || 'Ban co thong bao moi.'}</p>
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

            <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[var(--line)] bg-[var(--header-bg)] px-6 shadow-[var(--shadow)] backdrop-blur-md">
                <div className="flex w-full items-center justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href={APP_ROUTES.home}
                        className="flex items-center gap-1.5 border-r border-[var(--line)] pr-3 font-mono text-sm uppercase tracking-[0.28em] text-[var(--muted)] transition-all hover:text-[var(--line-hover)]"
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

                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => void handleNotificationPanelToggle()}
                                className={cn(
                                    'relative flex cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-sm transition-all hover:scale-110 hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] active:scale-95',
                                    isNotifOpen && 'border-[var(--line-hover)] shadow-md',
                                )}
                            >
                                <svg
                                    className={cn('h-4.5 w-4.5 transition-transform duration-300', isNotifOpen && 'rotate-12')}
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

                            {isNotifOpen && (
                                <div className="absolute right-0 z-30 mt-3 w-80 origin-top-right overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)] backdrop-blur-lg transition-all duration-300 animate-[fade-in-down_0.25s_ease-out] sm:w-96">
                                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />

                                    <div className="flex items-center justify-between border-b border-[var(--line)] px-5 pb-3 pt-4">
                                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                                            <span>Thông báo</span>
                                            {unreadCount > 0 && (
                                                <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                                    {unreadCount} mới
                                                </span>
                                            )}
                                        </h3>

                                        <div className="flex gap-2">
                                            {displayNotifications.length > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleMarkAllRead}
                                                        className="cursor-pointer text-[11px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                                                    >
                                                        Đọc tất cả
                                                    </button>
                                                    <span className="text-[var(--line)]">|</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAll}
                                                        className="cursor-pointer text-[11px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
                                                    >
                                                        Xóa hết
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="scrollbar-thin max-h-[360px] overflow-y-auto divide-y divide-[var(--line)]">
                                        {displayNotifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                                                <svg className="mb-3 h-10 w-10 text-[var(--muted)] opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                                </svg>
                                                <p className="text-xs font-medium text-[var(--muted)]">Hộp thư thông báo trống</p>
                                            </div>
                                        ) : (
                                            displayNotifications.map((item) => {
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
                                                            'flex cursor-pointer gap-3.5 px-5 py-3.5 transition-all hover:bg-[var(--bg-hover)]',
                                                            !item.isRead && 'bg-[var(--accent)]/[0.02]',
                                                        )}
                                                    >
                                                        <div className={cn('flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full', iconBg)}>
                                                            {notifIcon}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-1">
                                                                <p className={cn('text-xs font-bold leading-normal text-[var(--foreground)]', !item.isRead ? 'opacity-100' : 'opacity-80')}>
                                                                    {item.title}
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => handleToggleRead(item.id, event)}
                                                                    className="shrink-0 cursor-pointer text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]"
                                                                >
                                                                    {item.isRead ? 'Chưa đọc' : 'Đọc'}
                                                                </button>
                                                            </div>
                                                            <p className="truncate-2-lines mt-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">
                                                                {item.description}
                                                            </p>
                                                            <p className="mt-1.5 font-mono text-[10px] text-[var(--muted)] opacity-60">
                                                                {item.time}
                                                            </p>
                                                        </div>
                                                        {!item.isRead && <div className="h-2 w-2 shrink-0 self-center rounded-full bg-[var(--accent)]" />}
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
                            className="flex cursor-pointer items-center gap-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-[var(--accent-strong)] active:scale-95"
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
        </>
    );
}
