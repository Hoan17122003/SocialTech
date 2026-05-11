import { appConfig } from '@/common/config/env';

function isBrowser() {
    return typeof window !== 'undefined';
}

export const tokenStorage = {
    get() {
        if (!isBrowser()) {
            return null;
        }

        return window.localStorage.getItem(appConfig.accessTokenStorageKey);
    },
    set(token: string) {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.setItem(appConfig.accessTokenStorageKey, token);
    },
    clear() {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.removeItem(appConfig.accessTokenStorageKey);
    },
};
