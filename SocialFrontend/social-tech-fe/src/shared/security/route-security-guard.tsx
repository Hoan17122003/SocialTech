'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { decideRouteAccess, resolveRouteAuthentication } from '@/shared/security/security-resolver';

export function RouteSecurityGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isHydrated, roles } = useAuth();
    const policy = resolveRouteAuthentication(pathname);
    const decision = decideRouteAccess(policy, isAuthenticated, roles);
    const redirectTo = decision.allowed ? null : decision.redirectTo;

    useEffect(() => {
        if (!isHydrated || !redirectTo) {
            return;
        }

        router.replace(redirectTo);
    }, [isHydrated, redirectTo, router]);

    // Keep protected content off-screen while hydration decides auth from local storage.
    if (!isHydrated || !decision.allowed) {
        return null;
    }

    return <>{children}</>;
}
