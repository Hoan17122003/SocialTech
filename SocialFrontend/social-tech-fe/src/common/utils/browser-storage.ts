function isBrowser() {
    return typeof window !== 'undefined';
}

export const browserStorage = {
    get(key: string) {
        if (!isBrowser()) {
            return null;
        }

        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key: string, value: string) {
        if (!isBrowser()) {
            return;
        }

        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Storage can fail in private mode or strict browser policies; UI should keep running.
        }
    },
    remove(key: string) {
        if (!isBrowser()) {
            return;
        }

        try {
            window.localStorage.removeItem(key);
        } catch {
            // Same rationale as set(): storage is a convenience layer, not a rendering dependency.
        }
    },
    getJson<T>(key: string, fallback: T) {
        const stored = browserStorage.get(key);

        if (!stored) {
            return fallback;
        }

        try {
            return JSON.parse(stored) as T;
        } catch {
            return fallback;
        }
    },
    setJson(key: string, value: unknown) {
        browserStorage.set(key, JSON.stringify(value));
    },
};
