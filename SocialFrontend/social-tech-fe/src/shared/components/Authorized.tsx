'use client';

import { useAuth } from '@/providers/auth-provider';

type AuthorizedProps = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

export function Authorized({ children, fallback = null }: AuthorizedProps) {
    const { isAuthenticated, isHydrated } = useAuth();

    if (!isHydrated) return null;
    if (!isAuthenticated) return <>{fallback}</>;
    return <>{children}</>;
}

export function GuestOnly({ children, fallback = null }: AuthorizedProps) {
    const { isAuthenticated, isHydrated } = useAuth();

    if (!isHydrated) return null;
    if (isAuthenticated) return <>{fallback}</>;
    return <>{children}</>;
}

