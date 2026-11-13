import { browserStorage } from '@/common/utils/browser-storage';
import type { NotificationItem, SignalRNotificationPayload } from '@/shared/navigation/notifications/notification-center.types';

const NOTIFICATION_STORAGE_KEY = 'social-tech.notifications';

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
        case 'comment':
        case 'comment-reply':
            return 'comment';
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
    const createdAt = payload.createdAtUtc ?? payload.createdAt ?? payload.sentAt ?? payload.timestamp;
    const rawMessage = (
        payload.message ??
        payload.description ??
        payload.content ??
        payload.body ??
        ''
    ).trim();

    // Check if message is a comment reply notification: "title : ... \n body : <b>Author</b> ..."
    const titleMatch = rawMessage.match(/title\s*:\s*([^"\n\r]+)/i);
    const bodyMatch = rawMessage.match(/body\s*:\s*([\s\S]+)/i);
    if (titleMatch && bodyMatch) {
        const extractedTitle = titleMatch[1].replace(/["']/g, '').trim();
        const extractedBody = bodyMatch[1].replace(/<[^>]*>/g, '').trim();
        return {
            id: createNotificationId(payload.id),
            title: payload.title?.trim() || extractedTitle || 'Phản hồi bình luận',
            description: payload.description?.trim() || extractedBody,
            time: payload.time?.trim() || formatNotificationTime(createdAt),
            isRead: Boolean(payload.isRead),
            type: 'comment',
            href: payload.href ?? payload.url ?? payload.link ?? '/news',
        };
    }

    // Check if message is a comment on article: "... đã bình luận vào bài viết của bạn: ..."
    if (/đã bình luận vào bài viết của bạn|đã bình luận/i.test(rawMessage)) {
        return {
            id: createNotificationId(payload.id),
            title: payload.title?.trim() || 'Bình luận mới',
            description: payload.description?.trim() || rawMessage,
            time: payload.time?.trim() || formatNotificationTime(createdAt),
            isRead: Boolean(payload.isRead),
            type: 'comment',
            href: payload.href ?? payload.url ?? payload.link ?? '/news',
        };
    }

    // Check if message is a new article notification: "... vừa đăng bài viết mới: ..."
    if (/vừa đăng bài viết mới|vua dang bai viet moi|xuất bản bài viết/i.test(rawMessage)) {
        return {
            id: createNotificationId(payload.id),
            title: payload.title?.trim() || 'Bài viết mới',
            description: payload.description?.trim() || rawMessage,
            time: payload.time?.trim() || formatNotificationTime(createdAt),
            isRead: Boolean(payload.isRead),
            type: 'article',
            href: payload.href ?? payload.url ?? payload.link ?? '/news',
        };
    }

    const type = mapNotificationType(payload.type ?? payload.category ?? payload.kind);

    return {
        id: createNotificationId(payload.id),
        title: payload.title?.trim() || (type === 'comment' ? 'Bình luận mới' : type === 'article' ? 'Bài viết mới' : 'Thông báo mới'),
        description: rawMessage,
        time: payload.time?.trim() || formatNotificationTime(createdAt),
        isRead: Boolean(payload.isRead),
        type,
        href: payload.href ?? payload.url ?? payload.link ?? (type === 'article' || type === 'comment' ? '/news' : null),
    };
}

export function readStoredNotifications() {
    return browserStorage.getJson<NotificationItem[]>(NOTIFICATION_STORAGE_KEY, []);
}

export function writeStoredNotifications(items: NotificationItem[]) {
    browserStorage.setJson(NOTIFICATION_STORAGE_KEY, items);
}
