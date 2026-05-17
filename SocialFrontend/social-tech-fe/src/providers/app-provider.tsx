'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/providers/auth-provider';
import { GlobalLoadingOverlay } from '@/shared/ui/global-loading-overlay';

export function AppProvider({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <GlobalLoadingOverlay />
        </AuthProvider>
    );
}
