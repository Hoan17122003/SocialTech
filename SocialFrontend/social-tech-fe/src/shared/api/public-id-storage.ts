import { appConfig } from '@/common/config/env';

function isBrowser() {
    return typeof window !== 'undefined';
}

export const publicIdStorage = {
    get() {
        if (!isBrowser()) {
            return null;
        }

        return window.localStorage.getItem(appConfig.publicIdStorageKey);
    },
    set(publicId: string) {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.setItem(appConfig.publicIdStorageKey, publicId);
    },
    clear() {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.removeItem(appConfig.publicIdStorageKey);
    },
};

