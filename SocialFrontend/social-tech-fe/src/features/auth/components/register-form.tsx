'use client';

import Link from 'next/link';
import { useState } from 'react';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { ApiError } from '@/common/types/api';
import { authApi } from '@/features/auth/auth-api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';

type RegisterState = {
    username: string;
    displayName: string;
    email: string;
    password: string;
};

const initialState: RegisterState = {
    username: '',
    displayName: '',
    email: '',
    password: '',
};

export function RegisterForm() {
    const [form, setForm] = useState<RegisterState>(initialState);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function updateField<Key extends keyof RegisterState>(key: Key, value: RegisterState[Key]) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await authApi.register(form);
            setStatus(response.message || 'Đăng ký tài khoản mới thành công.');
            setForm(initialState);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Không thể tạo tài khoản lúc này.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-2xl p-8 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-2xl backdrop-blur-md relative overflow-hidden animate-fade-in-up">
            {/* Tech Ambient Glow decoration inside Card */}
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

            <div className="mb-8 space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                        User Onboarding
                    </span>
                    {/* Friendly hint for devs */}
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/15">
                        POST /api/User/create
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Tạo tài khoản mới</h1>
                <p className="text-sm text-[var(--muted)]">
                    Khai báo thông tin tài khoản của bạn để gia nhập mạng xã hội công nghệ. Các trường dữ liệu khớp hoàn toàn với Backend contract DTO.
                </p>
            </div>

            <form className="grid gap-5 md:grid-cols-2 relative z-10" onSubmit={handleSubmit}>
                {/* Username */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Tên tài khoản (Username)</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <Input
                            className="pl-11"
                            value={form.username}
                            onChange={(event) => updateField('username', event.target.value)}
                            placeholder="username"
                        />
                    </div>
                </div>

                {/* Display name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Tên hiển thị (Display Name)</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 2.667-.3 4-1" />
                            </svg>
                        </div>
                        <Input
                            className="pl-11"
                            value={form.displayName}
                            onChange={(event) => updateField('displayName', event.target.value)}
                            placeholder="Nguyễn Văn A"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Địa chỉ Email</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                            </svg>
                        </div>
                        <Input
                            type="email"
                            className="pl-11"
                            value={form.email}
                            onChange={(event) => updateField('email', event.target.value)}
                            placeholder="name@domain.com"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Mật khẩu bảo mật</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <Input
                            type="password"
                            className="pl-11"
                            value={form.password}
                            onChange={(event) => updateField('password', event.target.value)}
                            placeholder="Mật khẩu bảo mật ít nhất 8 ký tự"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="md:col-span-2 animate-fade-in">
                        <FormMessage type="error" message={error} />
                    </div>
                ) : null}
                {status ? (
                    <div className="md:col-span-2 animate-fade-in">
                        <FormMessage type="success" message={status} />
                    </div>
                ) : null}

                <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--line)]">
                    <p className="text-sm text-[var(--muted)]">
                        Đã có tài khoản rồi?{' '}
                        <Link href={APP_ROUTES.login} className="font-semibold text-[var(--accent)] hover:underline transition-all">
                            Đăng nhập
                        </Link>
                    </p>
                    <Button type="submit" className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-[var(--accent)] to-[#4facfe] hover:from-[var(--accent-strong)] hover:to-[#00f2fe] text-white font-semibold rounded-full shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-2" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Đang đăng ký...</span>
                            </>
                        ) : (
                            <>
                                <span>Tạo tài khoản</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l3 3m0 0l-3 3m3-3H8m-5 1a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
