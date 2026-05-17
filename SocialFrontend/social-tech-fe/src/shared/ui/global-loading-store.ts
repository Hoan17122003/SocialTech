type LoadingListener = () => void;

let activeRequests = 0;
const listeners = new Set<LoadingListener>();

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

export const globalLoadingStore = {
    subscribe(listener: LoadingListener) {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    },
    getSnapshot() {
        return activeRequests;
    },
    start() {
        activeRequests += 1;
        emitChange();
    },
    stop() {
        activeRequests = Math.max(0, activeRequests - 1);
        emitChange();
    },
};
