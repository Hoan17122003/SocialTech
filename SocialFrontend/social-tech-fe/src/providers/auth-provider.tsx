'use client';

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { authApi } from '@/features/auth/auth-api';
import { tokenStorage } from '@/shared/api/token-storage';
import { publicIdStorage } from '@/shared/api/public-id-storage';
import { getRolesFromAccessToken } from '@/shared/auth/role-utils';

type AuthContextValue = {
    accessToken: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    roles: string[];
    hasRole: (role: string) => boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useHydrated() {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const isHydrated = useHydrated();
    const [accessTokenOverride, setAccessTokenOverride] = useState<string | null | undefined>(undefined);
    const accessToken = accessTokenOverride ?? (isHydrated ? tokenStorage.get() : null);
    const roles = getRolesFromAccessToken(accessToken);

    const value = useMemo<AuthContextValue>(
        () => ({
            accessToken,
            isAuthenticated: Boolean(accessToken),
            isHydrated,
            roles,
            hasRole(role: string) {
                return roles.includes(role);
            },
            async login(email: string, password: string) {
                const response = await authApi.login({ email, password });
                tokenStorage.set(response.accessToken);
                publicIdStorage.set(response.publicId);
                setAccessTokenOverride(response.accessToken);
            },
            async logout() {
                try {
                    await authApi.logout();
                } catch (error) {
                    // Logout should be best-effort: if the API fails (network/back-end down),
                    // still clear local auth state and continue without crashing the UI.
                    console.warn('Logout request failed; clearing local auth state anyway.', error);
                } finally {
                    tokenStorage.clear();
                    publicIdStorage.clear();
                    setAccessTokenOverride(null);
                }
            },
        }),
        [accessToken, isHydrated, roles],
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
