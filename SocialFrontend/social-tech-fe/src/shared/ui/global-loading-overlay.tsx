'use client';

import { useSyncExternalStore } from 'react';
import { globalLoadingStore } from '@/shared/ui/global-loading-store';

export function GlobalLoadingOverlay() {
    const activeRequests = useSyncExternalStore(
        globalLoadingStore.subscribe,
        globalLoadingStore.getSnapshot,
        globalLoadingStore.getServerSnapshot,
    );

    if (activeRequests < 1) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(244,239,230,0.78)] px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)]">
                <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center">
                        <div className="absolute h-14 w-14 rounded-full border-4 border-[rgba(204,95,61,0.14)]" />
                        <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-[var(--accent)] border-r-[var(--accent-strong)]" />
                        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" />
                    </div>

                    <div className="space-y-1">
                        <p className="text-base font-semibold text-[var(--foreground)]">Đang xử lý yêu cầu</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
