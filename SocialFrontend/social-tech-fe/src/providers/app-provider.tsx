'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { ChatProvider } from '@/providers/chat-provider';
import { GlobalLoadingOverlay } from '@/shared/ui/global-loading-overlay';

export function AppProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ChatProvider>
                    {children}
                    <GlobalLoadingOverlay />
                </ChatProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
