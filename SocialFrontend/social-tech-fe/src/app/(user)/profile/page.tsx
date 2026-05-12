'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfilePanel } from '@/features/users/components/profile-panel';
import { publicIdStorage } from '@/shared/api/public-id-storage';
import { useAuth } from '@/providers/auth-provider';

export default function ProfilePage() {
    const router = useRouter();
    const { isHydrated } = useAuth();

    const publicId = isHydrated ? publicIdStorage.get() : null;

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (!publicId) {
            router.replace('/login');
        }
    }, [isHydrated, publicId, router]);

    if (!isHydrated || !publicId) {
        return null;
    }

    return <ProfilePanel userId={publicId} />;
}
