'use client';

import * as signalR from '@microsoft/signalr';
import { appConfig } from '@/common/config/env';
import { tokenStorage } from '@/shared/api/token-storage';

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
