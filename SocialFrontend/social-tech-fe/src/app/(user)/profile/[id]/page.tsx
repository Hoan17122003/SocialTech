import { ProfilePanel } from '@/features/users/components/profile-panel';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <ProfilePanel userId={id} />;
}
