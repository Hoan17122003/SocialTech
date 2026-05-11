'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/features/auth/auth-api';
import { tokenStorage } from '@/shared/api/token-storage';

type AuthContextValue = {
    accessToken: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setAccessToken(tokenStorage.get());
        setIsHydrated(true);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            accessToken,
            isAuthenticated: Boolean(accessToken),
            isHydrated,
            async login(email: string, password: string) {
                const response = await authApi.login({ email, password });
                tokenStorage.set(response.accessToken);
                setAccessToken(response.accessToken);
            },
            async logout() {
                try {
                    await authApi.logout();
                } finally {
                    tokenStorage.clear();
                    setAccessToken(null);
                }
            },
        }),
        [accessToken, isHydrated],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
