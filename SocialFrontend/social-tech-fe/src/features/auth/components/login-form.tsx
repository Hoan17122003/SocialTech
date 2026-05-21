'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { ApiError } from '@/common/types/api';
import { usersApi } from '@/features/users/users-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('demo@socialtech.local');
    const [password, setPassword] = useState('Password!12345');
    const [status, setStatus] = useState<string | null>(null);
    const [errorLogin, setErrorLogin] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('demo@socialtech.local');
    const [forgotPasswordStatus, setForgotPasswordStatus] = useState<string | null>(null);
    const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
    const [isForgotPasswordSubmitting, setIsForgotPasswordSubmitting] = useState(false);

    function validateLoginEmail(value: string) {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            setErrorLogin('Vui lòng nhập email ở form đăng nhập.');
            return false;
        }

        if (!isValidEmail(trimmedValue)) {
            setErrorLogin('Vui lòng nhập đúng định dạng email trong ô.');
            return false;
        }

        setErrorLogin(null);
        return true;
    }

    function validateForgotPasswordEmail(value: string) {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            setForgotPasswordError('Vui lòng nhập email trong popup.');
            return false;
        }

        if (!isValidEmail(trimmedValue)) {
            setForgotPasswordError('Vui lòng nhập đúng định dạng email trong popup quên mật khẩu.');
            return false;
        }

        setForgotPasswordError(null);
        return true;
    }

    function openForgotPasswordPopup() {
        setForgotPasswordEmail(email);
        setForgotPasswordStatus(null);
        setForgotPasswordError(null);
        setIsForgotPasswordOpen(true);
    }

    function closeForgotPasswordPopup() {
        if (isForgotPasswordSubmitting) {
            return;
        }
        setIsForgotPasswordOpen(false);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);
        setErrorLogin(null);

        if (!validateLoginEmail(email)) {
            return;
        }

        setIsSubmitting(true);

        try {
            await login(email.trim(), password);
            setStatus('Đăng nhập thành công.');
            router.push(APP_ROUTES.dashboard);
        } catch (cause) {
            setErrorLogin(cause instanceof ApiError ? cause.message : 'Không thể đăng nhập ngay lúc này.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleForgotPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setForgotPasswordStatus(null);
        setForgotPasswordError(null);

        if (!validateForgotPasswordEmail(forgotPasswordEmail)) {
            return;
        }

        setIsForgotPasswordSubmitting(true);

        try {
            const response = await usersApi.forgotPassword({ email: forgotPasswordEmail.trim() });
            setForgotPasswordStatus(response.message || 'Yêu cầu khôi phục mật khẩu đã được gửi.');
            setIsForgotPasswordOpen(false);
        } catch (cause) {
            setForgotPasswordError(
                cause instanceof ApiError ? cause.message : 'Không thể gửi yêu cầu khôi phục mật khẩu lúc này.',
            );
        } finally {
            setIsForgotPasswordSubmitting(false);
        }
    }

    return (
        <>
            <Card className="w-full max-w-xl p-8 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-2xl backdrop-blur-md relative overflow-hidden animate-fade-in-up">
                {/* Tech Ambient Glow decoration inside Card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
                
                <div className="mb-8 space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                            Authentication
                        </span>
                        {/* Friendly hint for devs */}
                        <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">
                            POST /api/User/login
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Đăng nhập</h1>
                    <p className="text-sm text-[var(--muted)]">
                        Hệ thống điều phối xác thực phiên làm việc an toàn. Nhập tài khoản demo của bạn để truy cập Workspace.
                    </p>
                </div>

                <form className="space-y-5 relative z-10" onSubmit={handleSubmit} noValidate>
                    {/* Email field with At-sign Icon */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Email đăng nhập</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                </svg>
                            </div>
                            <Input
                                type="email"
                                className="pl-11"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    if (errorLogin) {
                                        setErrorLogin(null);
                                    }
                                }}
                                onBlur={(event) => {
                                    validateLoginEmail(event.target.value);
                                }}
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    {/* Password field with Key Icon */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Mật khẩu</label>
                            <button
                                type="button"
                                onClick={openForgotPasswordPopup}
                                className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] transition-all"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5 4a3 3 0 11-6 0 3 3 0 016 0zm6 2.755V17a2 2 0 01-2 2H4a2 2 0 01-2-2v-4.245a8 8 0 0116 0z" />
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

                    {errorLogin ? <FormMessage type="error" message={errorLogin} /> : null}
                    {status ? <FormMessage type="success" message={status} /> : null}
                    
                    <Button type="submit" className="w-full py-3.5 bg-gradient-to-r from-[var(--accent)] to-[#4facfe] hover:from-[var(--accent-strong)] hover:to-[#00f2fe] text-white font-semibold rounded-full shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-2" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </Button>
                </form>

                {forgotPasswordStatus ? (
                    <div className="mt-4">
                        <FormMessage type="success" message={`Gửi thông báo đến tài khoản bạn ${forgotPasswordStatus}`} />
                    </div>
                ) : null}

                <div className="mt-6 border-t border-[var(--line)] pt-4 text-center">
                    <p className="text-sm text-[var(--muted)]">
                        Chưa có tài khoản trên SocialTech?{' '}
                        <Link href={APP_ROUTES.register} className="font-semibold text-[var(--accent)] hover:underline transition-all">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </Card>

            {/* Popup recover password */}
            {isForgotPasswordOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6 py-12 animate-fade-in"
                    onClick={closeForgotPasswordPopup}
                >
                    <Card 
                        className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl relative overflow-hidden animate-fade-in-up"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
                        
                        <div className="mb-6 flex items-start justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                                    Password Recovery
                                </span>
                                <h2 className="text-xl font-bold text-[var(--foreground)]">Khôi phục mật khẩu</h2>
                                <p className="text-xs text-[var(--muted)]">
                                    Nhập email đã đăng ký của bạn bên dưới.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeForgotPasswordPopup}
                                className="h-8 w-8 rounded-full border border-[var(--line)] hover:bg-[var(--bg-hover)] text-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                                aria-label="Dong popup quen mat khau"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form className="space-y-4 relative z-10" onSubmit={handleForgotPasswordSubmit} noValidate>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[var(--foreground)] opacity-85">Địa chỉ Email</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                        </svg>
                                    </div>
                                    <Input
                                        type="email"
                                        className="pl-11"
                                        value={forgotPasswordEmail}
                                        onChange={(event) => {
                                            setForgotPasswordEmail(event.target.value);
                                            if (forgotPasswordError) {
                                                setForgotPasswordError(null);
                                            }
                                        }}
                                        onBlur={(event) => {
                                            validateForgotPasswordEmail(event.target.value);
                                        }}
                                        placeholder="name@domain.com"
                                    />
                                </div>
                            </div>
                            
                            {forgotPasswordError ? <FormMessage type="error" message={forgotPasswordError} /> : null}
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={closeForgotPasswordPopup}
                                    disabled={isForgotPasswordSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button type="submit" disabled={isForgotPasswordSubmitting}>
                                    {isForgotPasswordSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            ) : null}
        </>
    );
}
