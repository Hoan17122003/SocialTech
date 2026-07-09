'use client';

import { ProfilePanel } from '@/features/users/components/profile-panel';
import { publicIdStorage } from '@/shared/api/public-id-storage';
import { useAuth } from '@/providers/auth-provider';

export default function ProfilePage() {
    const { isHydrated } = useAuth();

    // RouteSecurityGuard owns auth redirects; this page only resolves the current user's public id.
    const publicId = isHydrated ? publicIdStorage.get() : null;

    if (!isHydrated || !publicId) {
        return null;
    }

    return <ProfilePanel userId={publicId} />;
}
