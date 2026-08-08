'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { useAuth } from '@/providers/auth-provider';
import { createNotificationHubConnection } from '@/shared/api/realtime-client';
import type {
    NotificationItem,
    SignalRNotificationPayload,
    ToastNotification,
} from '@/shared/navigation/notifications/notification-center.types';
import {
    readStoredNotifications,
    toNotificationItem,
    writeStoredNotifications,
} from '@/shared/navigation/notifications/notification-center.utils';

type NotificationHubConnection = ReturnType<typeof createNotificationHubConnection>;

export function useNotificationCenter() {
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const router = useRouter();
    const { accessToken, isHydrated, logout } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>(() => readStoredNotifications());
    const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const connectionRef = useRef<NotificationHubConnection | null>(null);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (!isHydrated || !accessToken || typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }

        if (window.Notification.permission === 'default') {
            void window.Notification.requestPermission().catch(() => undefined);
        }
    }, [accessToken, isHydrated]);

    useEffect(() => {
        const isGuestRoute = pathnameRef.current === APP_ROUTES.login || pathnameRef.current === APP_ROUTES.register;
        if (!isHydrated || !accessToken || isGuestRoute) {
            return;
        }

        const connection = createNotificationHubConnection();
        connectionRef.current = connection;
        let isDisposed = false;
        let hasStarted = false;

        const saveNotifications = (
            updater: NotificationItem[] | ((current: NotificationItem[]) => NotificationItem[]),
        ) => {
            setNotifications((current) => {
                const nextItems = typeof updater === 'function' ? updater(current) : updater;
                writeStoredNotifications(nextItems);
                return nextItems;
            });
        };

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

        const handleNotificationReceived = (payload: SignalRNotificationPayload) => {
            const nextNotification = toNotificationItem(payload);

            saveNotifications((current) => [
                nextNotification,
                ...current.filter((item) => item.id !== nextNotification.id),
            ]);

            showToastNotification(nextNotification);
            showBrowserNotification(nextNotification);
        };

        const handleNotificationsRead = (notificationIds: Array<string | number>) => {
            const readIds = new Set(notificationIds.map((notificationId) => String(notificationId)));
            saveNotifications((current) =>
                current.map((item) => (readIds.has(item.id) ? { ...item, isRead: true } : item)),
            );
        };

        connection.on('notificationReceived', handleNotificationReceived);
        connection.on('notificationsRead', handleNotificationsRead);

        async function startConnection(hubConnection: NotificationHubConnection) {
            try {
                await hubConnection.start();
                hasStarted = true;

                const initialNotifications = (await hubConnection.invoke(
                    'GetMyNotifications',
                )) as SignalRNotificationPayload[];

                if (isDisposed) {
                    return;
                }

                saveNotifications(initialNotifications.map((payload) => toNotificationItem(payload)));
            } catch (error: unknown) {
                console.error('Failed to connect to notification hub.', error);
                const errorStr = String(error);
                if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
                    try {
                        await logout();
                    } finally {
                        router.push(APP_ROUTES.login);
                    }
                }
            }
        }

        void startConnection(connection);

        return () => {
            isDisposed = true;
            connection.off('notificationReceived', handleNotificationReceived);
            connection.off('notificationsRead', handleNotificationsRead);
            if (connectionRef.current === connection) {
                connectionRef.current = null;
            }

            if (!hasStarted) {
                return;
            }

            void connection.stop().catch((error: unknown) => {
                console.error('Failed to stop notification hub connection.', error);
            });
        };
    }, [accessToken, isHydrated, logout, router]);

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

    const saveNotifications = (items: NotificationItem[]) => {
        setNotifications(items);
        writeStoredNotifications(items);
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
        const unreadNotificationIds = notifications.filter((item) => !item.isRead).map((item) => Number(item.id));

        await markNotificationsAsRead(unreadNotificationIds);
        saveNotifications(notifications.map((item) => ({ ...item, isRead: true })));
    };

    const handleClearAll = () => {
        saveNotifications([]);
    };

    const handleToggleRead = async (id: string) => {
        const targetNotification = notifications.find((item) => item.id === id);
        if (targetNotification && !targetNotification.isRead) {
            await markNotificationsAsRead([Number(id)]);
        }

        saveNotifications(notifications.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item)));
    };

    const handleNotificationPanelToggle = async () => {
        const nextIsOpen = !isNotifOpen;
        setIsNotifOpen(nextIsOpen);

        if (!nextIsOpen) {
            return;
        }

        const unreadNotificationIds = notifications.filter((item) => !item.isRead).map((item) => Number(item.id));

        await markNotificationsAsRead(unreadNotificationIds);

        if (unreadNotificationIds.length > 0) {
            saveNotifications(notifications.map((item) => ({ ...item, isRead: true })));
        }
    };

    const handleNotificationClick = (item: NotificationItem) => {
        saveNotifications(
            notifications.map((notification) =>
                notification.id === item.id ? { ...notification, isRead: true } : notification,
            ),
        );

        if (item.href) {
            router.push(item.href);
        }

        setIsNotifOpen(false);
    };

    const displayNotifications = isHydrated ? notifications : [];
    const unreadCount = displayNotifications.filter((item) => !item.isRead).length;

    return {
        displayNotifications,
        dismissToast,
        handleClearAll,
        handleMarkAllRead,
        handleNotificationClick,
        handleNotificationPanelToggle,
        handleToggleRead,
        isNotifOpen,
        notifRef,
        toastNotifications,
        unreadCount,
    };
}
