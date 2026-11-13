'use client';

import * as signalR from '@microsoft/signalr';
import { appConfig } from '@/common/config/env';
import { tokenStorage } from '@/shared/api/token-storage';

function createHubConnection(path: string) {
    const hubUrl = new URL(path, appConfig.apiBaseUrl).toString();

    return new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => tokenStorage.get() ?? '',
            withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000, 30000, 60000])
        .build();
}

export function createNotificationHubConnection() {
    return createHubConnection('/notificationHub');
}

export function createChatHubConnection() {
    return createHubConnection('/chatHub');
}
