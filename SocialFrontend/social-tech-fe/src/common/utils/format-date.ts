function toValidDate(value?: string | Date | null) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function getDateTimestamp(value?: string | Date | null) {
    // Sorting code should not repeat invalid-date handling at every call site.
    return toValidDate(value)?.getTime() ?? 0;
}

export function formatDateTime(value?: string | Date | null) {
    const date = toValidDate(value);

    if (!date) {
        return '--';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function formatChatMessageTime(value?: string | Date | null) {
    const date = toValidDate(value);

    if (!date) {
        return '';
    }

    // Bubble chat only needs clock time; the inbox list carries broader date context.
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatChatListTime(value?: string | Date | null) {
    const date = toValidDate(value);

    if (!date) {
        return '';
    }

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return formatChatMessageTime(date);
    }

    if (date.getFullYear() === now.getFullYear()) {
        return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
    }

    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
