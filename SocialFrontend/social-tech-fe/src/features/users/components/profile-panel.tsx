'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/common/utils/format-date';
import { ApiError } from '@/common/types/api';
import { usersApi } from '@/features/users/users-api';
import type { UserProfile } from '@/features/users/contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input, Textarea } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';
import { SectionShell } from '@/shared/ui/section-shell';
import { useTheme } from '@/providers/theme-provider';

export function ProfilePanel({ userId }: { userId?: string }) {
    const { theme, toggleTheme } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<File | undefined>(undefined);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal settings states
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'security'>('profile');

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            try {
                const response = await usersApi.getProfile(userId);

                if (!isMounted || !response.data) {
                    return;
                }

                setProfile(response.data);
                setDisplayName(response.data.displayName);
                setBio(response.data.bio);
                setIsPrivate(response.data.isPrivateAccount);
            } catch (cause) {
                if (isMounted) {
                    setError(cause instanceof ApiError ? cause.message : 'Không thể tải hồ sơ người dùng.');
                }
            }
        }

        void loadProfile();

        return () => {
            isMounted = false;
        };
    }, [userId]);

    async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setStatus(null);
        setIsSubmitting(true);

        try {
            await usersApi.updateProfile({
                displayName,
                bio,
                profileImageUrl: avatar,
                ...(password ? { password } : {}),
            });
            setStatus('Cập nhật thông tin tài khoản thành công.');

            // Refresh local profile data representation
            setProfile((prev) =>
                prev
                    ? {
                          ...prev,
                          displayName,
                          bio,
                          isPrivateAccount: isPrivate,
                      }
                    : null,
            );

            // Clear password field after success
            setPassword('');

            // Automatically close modal after short delay
            setTimeout(() => {
                setIsSettingsOpen(false);
                setStatus(null);
            }, 1000);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Không thể cập nhật hồ sơ cá nhân.');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (error && !profile) {
        return <EmptyState title="Không tải được hồ sơ" description={error} />;
    }

    if (!profile) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center space-y-4">
                    <svg
                        className="animate-spin h-10 w-10 text-[var(--accent)] mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <p className="text-sm font-semibold text-[var(--muted)]">Đang tải thông tin hồ sơ...</p>
                </div>
            </div>
        );
    }

    // Get initials for custom avatar fallback
    const initials = profile.displayName
        ? profile.displayName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : 'ST';

    return (
        <div className="max-w-3xl mx-auto w-full animate-fade-in-up relative">
            <SectionShell
                eyebrow="User Profile"
                title="Hồ sơ cá nhân"
                description={
                    profile.isPermissionEdit
                        ? 'Tổng quan hoạt động và các cấu hình quản trị tài khoản của bạn.'
                        : 'Trang thông tin cá nhân và danh sách hoạt động xuất bản của thành viên.'
                }
            >
                <div className="grid gap-6 mt-4">
                    {/* Premium Profile Intro Card */}
                    <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
                        <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

                        {/* Settings Button - Only visible for profile owner (authorization check) */}
                        {profile.isPermissionEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setStatus(null);
                                    setError(null);
                                }}
                                className="absolute top-6 right-6 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--background-soft)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
                                aria-label="Cấu hình tài khoản"
                            >
                                <svg
                                    className="h-5 w-5 animate-spin-hover"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </button>
                        )}

                        {/* Avatar container */}
                        <div className="relative h-24 w-24 rounded-full p-1 bg-gradient-to-tr from-[var(--accent)] to-[#4facfe] shadow-lg flex-shrink-0 animate-pulse-slow">
                            <div className="h-full w-full rounded-full bg-[var(--surface)] flex items-center justify-center overflow-hidden">
                                {profile.profileImageUrl ? (
                                    <img
                                        src={profile.profileImageUrl}
                                        alt={profile.displayName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-extrabold bg-gradient-to-r from-[var(--accent)] to-[#4facfe] bg-clip-text text-transparent">
                                        {initials}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="text-center sm:text-left space-y-1.5 min-w-0 pr-8">
                            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight truncate">
                                    {profile.displayName}
                                </h3>
                                {profile.isPermissionEdit && (
                                    <span className="px-2.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 rounded-full">
                                        Chủ tài khoản
                                    </span>
                                )}
                                {profile.isPrivateAccount && (
                                    <span className="px-2.5 py-0.5 text-[9px] font-mono font-semibold text-indigo-500 bg-indigo-500/10 border border-indigo-500/15 rounded-full">
                                        Riêng tư
                                    </span>
                                )}
                            </div>
                            <p className="text-sm leading-6 text-[var(--muted)] line-clamp-3">
                                {profile.bio || 'Người dùng này chưa cập nhật tiểu sử cá nhân.'}
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 grid-cols-3">
                        <StatCard
                            label="Followers"
                            value={profile.followersCount}
                            icon={
                                <svg
                                    className="h-4 w-4 text-indigo-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Following"
                            value={profile.followingsCount}
                            icon={
                                <svg
                                    className="h-4 w-4 text-cyan-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M18 9l3 3m0 0l-3 3m3-3H8m-5 1a6 6 0 0112 0v1H3v-1z"
                                    />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Số bài viết đã đăng"
                            // Todo : cần update lại, bắt sự kiện tới 1 độ dài nào đó sẽ phân trang và gọi API lấy bài viết trong profile
                            value={profile.postCounts ?? profile.recentPosts.length}
                            icon={
                                <svg
                                    className="h-4 w-4 text-emerald-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                </svg>
                            }
                        />
                    </div>

                    {/* Recent Posts Panel */}
                    <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
                        <div className="flex items-center gap-2 mb-5">
                            <svg
                                className="h-5 w-5 text-[var(--accent)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                />
                            </svg>
                            <h3 className="text-md font-bold uppercase tracking-[0.16em] text-[var(--foreground)]">
                                Bài viết gần đây
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            {profile.recentPosts.length ? (
                                profile.recentPosts.map((post) => (
                                    <div
                                        key={post.postId}
                                        className="rounded-2xl border border-[var(--line)] bg-[var(--background-soft)] p-5 hover:border-[var(--accent)]/30 hover:shadow-md transition-all duration-300 group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <h4 className="font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-300">
                                                {post.title}
                                            </h4>
                                            <span className="text-xs text-[var(--muted)] shrink-0 bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 rounded-full">
                                                {formatDateTime(post.updatedAt)}
                                            </span>
                                        </div>
                                        <p className="mt-2.5 text-sm leading-6 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors duration-300 line-clamp-3">
                                            {post.body}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[var(--muted)] text-center py-6">
                                    Chưa có bài viết nào được đăng tải.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </SectionShell>

            {/* Popup Settings Modal (Gear Icon Click) */}
            {isSettingsOpen && profile.isPermissionEdit && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 animate-fade-in"
                    onClick={() => {
                        if (!isSubmitting) setIsSettingsOpen(false);
                    }}
                >
                    <Card
                        className="w-full max-w-lg rounded-[2.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in-up"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-[var(--accent)]/5 blur-2xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4 mb-6 relative z-10">
                            <div>
                                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--muted)]">
                                    Account Control Panel
                                </span>
                                <h2 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
                                    Cấu hình tài khoản
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(false)}
                                disabled={isSubmitting}
                                className="h-8 w-8 rounded-full border border-[var(--line)] hover:bg-[var(--bg-hover)] text-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-50"
                                aria-label="Đóng popup cấu hình"
                            >
                                <svg
                                    className="h-4.5 w-4.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Tabs Nav */}
                        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3 mb-5 relative z-10">
                            <button
                                type="button"
                                onClick={() => setSettingsTab('profile')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    settingsTab === 'profile'
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm'
                                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                                Cá nhân hóa (Profile)
                            </button>

                            <button
                                type="button"
                                onClick={() => setSettingsTab('security')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    settingsTab === 'security'
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm'
                                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                                Bảo mật & Hệ thống
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleUpdate} className="space-y-5 relative z-10">
                            {settingsTab === 'profile' ? (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Display name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                            Tên hiển thị (Display Name)
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                                                <svg
                                                    className="h-4.5 w-4.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 2.667-.3 4-1"
                                                    />
                                                </svg>
                                            </div>
                                            <Input
                                                className="pl-11"
                                                value={displayName}
                                                onChange={(event) => setDisplayName(event.target.value)}
                                                placeholder="Nguyễn Văn A"
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                            Tiểu sử (Bio)
                                        </label>
                                        <Textarea
                                            value={bio}
                                            onChange={(event) => setBio(event.target.value)}
                                            placeholder="Giới thiệu bản thân..."
                                        />
                                    </div>

                                    {/* File Avatar */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                            Ảnh đại diện mới
                                        </label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) => setAvatar(event.target.files?.[0])}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Change Password option */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">
                                            Mật khẩu mới (Bỏ trống nếu không đổi)
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                                                <svg
                                                    className="h-4.5 w-4.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                    />
                                                </svg>
                                            </div>
                                            <Input
                                                type="password"
                                                className="pl-11"
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                placeholder="••••••••••••"
                                            />
                                        </div>
                                    </div>

                                    {/* Private Account toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--line)] bg-[var(--background-soft)]">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold text-[var(--foreground)]">
                                                Chế độ riêng tư
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                                Chỉ cho phép follower xem nội dung bài viết.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={(event) => setIsPrivate(event.target.checked)}
                                            className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                                        />
                                    </div>

                                    {/* Quickly Change Theme preferences */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--line)] bg-[var(--background-soft)]">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold text-[var(--foreground)]">
                                                Chế độ giao diện
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                                Chọn giao diện Tối (Dark) hoặc Sáng (Light).
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleTheme}
                                            className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] text-[var(--foreground)] transition-all cursor-pointer"
                                        >
                                            Chuyển sang {theme === 'light' ? 'Tối (Dark)' : 'Sáng (Light)'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Message alerts */}
                            {error ? <FormMessage type="error" message={error} /> : null}
                            {status ? <FormMessage type="success" message={status} /> : null}

                            {/* Modal actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsSettingsOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-[var(--accent)] to-[#4facfe] hover:from-[var(--accent-strong)] hover:to-[#00f2fe] text-white px-5 rounded-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
    return (
        <div className="glow-card rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
                {icon && (
                    <div className="p-1.5 rounded-lg bg-[var(--background-soft)] border border-[var(--line)]">
                        {icon}
                    </div>
                )}
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{value}</p>
        </div>
    );
}
