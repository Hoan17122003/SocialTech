export interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'success' | 'warning' | 'article' | 'comment';
    href?: string | null;
}

export type SignalRNotificationPayload = {
    id?: string | number;
    title?: string | null;
    description?: string | null;
    message?: string | null;
    content?: string | null;
    body?: string | null;
    time?: string | null;
    createdAt?: string | null;
    createdAtUtc?: string | null;
    readAtUtc?: string | null;
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


export type ToastNotification = NotificationItem & { toastId: string };
