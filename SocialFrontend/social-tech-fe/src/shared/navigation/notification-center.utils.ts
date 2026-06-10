import type { NotificationItem, SignalRNotificationPayload } from '@/shared/navigation/notification-center.types';

const NOTIFICATION_STORAGE_KEY = 'social-tech.notifications';

function formatNotificationTime(value?: string | null) {
    if (!value) {
        return 'Vua xong';
    }

    const createdAt = new Date(value);

    if (Number.isNaN(createdAt.getTime())) {
        return value;
    }

    const diffMs = createdAt.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 1) {
        return 'Vua xong';
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

export function toNotificationItem(payload: SignalRNotificationPayload): NotificationItem {
    const createdAt = payload.createdAt ?? payload.sentAt ?? payload.timestamp;
    const type = mapNotificationType(payload.type ?? payload.category ?? payload.kind);

    return {
        id: createNotificationId(payload.id),
        title: payload.title?.trim() || 'Thong bao moi',
        description:
            payload.description?.trim() ||
            payload.message?.trim() ||
            payload.content?.trim() ||
            payload.body?.trim() ||
            '',
        time: payload.time?.trim() || formatNotificationTime(createdAt),
        isRead: Boolean(payload.isRead),
        type,
        href: payload.href ?? payload.url ?? payload.link ?? (type === 'article' ? '/news' : null),
    };
}

export function readStoredNotifications() {
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

export function writeStoredNotifications(items: NotificationItem[]) {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
}
