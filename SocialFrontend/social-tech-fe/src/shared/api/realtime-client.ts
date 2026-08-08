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
        .withAutomaticReconnect()
        .build();
}

export function createNotificationHubConnection() {
    return createHubConnection('/notificationHub');
}

export function createChatHubConnection() {
    return createHubConnection('/chatHub');
}
