import { appConfig } from '@/common/config/env';
import { browserStorage } from '@/common/utils/browser-storage';

export const tokenStorage = {
    get() {
        return browserStorage.get(appConfig.accessTokenStorageKey);
    },
    set(token: string) {
        browserStorage.set(appConfig.accessTokenStorageKey, token);
    },
    clear() {
        browserStorage.remove(appConfig.accessTokenStorageKey);
    },
};
