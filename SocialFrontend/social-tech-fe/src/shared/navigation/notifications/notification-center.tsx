'use client';

import { NotificationBellButton } from '@/shared/navigation/notifications/notification-bell-button';
import { NotificationPanel } from '@/shared/navigation/notifications/notification-panel';
import { NotificationToastList } from '@/shared/navigation/notifications/notification-toast-list';
import { useNotificationCenter } from '@/shared/navigation/notifications/use-notification-center';

export function NotificationCenter() {
    const {
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
    } = useNotificationCenter();

    return (
        <>
            <NotificationToastList
                items={toastNotifications}
                onClick={(toast) => {
                    dismissToast(toast.toastId);
                    handleNotificationClick(toast);
                }}
            />

            <div className="relative" ref={notifRef}>
                <NotificationBellButton
                    isOpen={isNotifOpen}
                    onClick={() => void handleNotificationPanelToggle()}
                    unreadCount={unreadCount}
                />
                <NotificationPanel
                    isOpen={isNotifOpen}
                    items={displayNotifications}
                    onClearAll={handleClearAll}
                    onItemClick={handleNotificationClick}
                    onMarkAllRead={() => void handleMarkAllRead()}
                    onToggleRead={handleToggleRead}
                    unreadCount={unreadCount}
                />
            </div>
        </>
    );
}
