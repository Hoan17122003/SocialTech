'use client';

import * as signalR from '@microsoft/signalr';
import { appConfig } from '@/common/config/env';
import { tokenStorage } from '@/shared/api/token-storage';
import { SignalRNotificationPayload } from '../navigation/notifications/notification-center.types';

export function createNotificationHubConnection() {
    const hubUrl = new URL('/notificationHub', appConfig.apiBaseUrl).toString();

    return new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => tokenStorage.get() ?? '',
            withCredentials: true,
        })
        .withAutomaticReconnect()
        .build();
}

export function createNotificationMessageListner() {
    const hubMessageConnection = new URL('/chatHub', appConfig.apiBaseUrl).toString();

    return new signalR.HubConnectionBuilder()
        .withUrl(hubMessageConnection, {
            accessTokenFactory: () => tokenStorage.get() ?? '',
            withCredentials: true,
        })
        .withAutomaticReconnect()
        .build();
}