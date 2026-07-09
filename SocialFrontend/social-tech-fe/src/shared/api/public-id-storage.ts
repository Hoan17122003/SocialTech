import { appConfig } from '@/common/config/env';
import { browserStorage } from '@/common/utils/browser-storage';

export const publicIdStorage = {
    get() {
        return browserStorage.get(appConfig.publicIdStorageKey);
    },
    set(publicId: string) {
        browserStorage.set(appConfig.publicIdStorageKey, publicId);
    },
    clear() {
        browserStorage.remove(appConfig.publicIdStorageKey);
    },
};
