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
            setErrorLogin('Vui lòng nhập email ở form đăng nhập.');
            return false;
        }

        if (!isValidEmail(trimmedValue)) {
            setErrorLogin('Vui lòng nhập đúng định dạng email trong ô.');
            return false;
        }

        setErrorLogin(null);
        return true;
    }

    function validateForgotPasswordEmail(value: string) {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            setForgotPasswordError('Vui lòng nhập email trong popup.');
            return false;
        }

        if (!isValidEmail(trimmedValue)) {
            setForgotPasswordError('vui lòng nhập đúng định dạng email trong popup quên mật khẩu.');
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
            setStatus('Đăng nhập thành công.');
            router.push(APP_ROUTES.dashboard);
        } catch (cause) {
            setErrorLogin(cause instanceof ApiError ? cause.message : 'Không thể đăng nhập ngay lúc này.');
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
            setForgotPasswordStatus(response.message || 'Yêu cầu khôi phục mật khẩu đã được gửi.');
            setIsForgotPasswordOpen(false);
        } catch (cause) {
            setForgotPasswordError(
                cause instanceof ApiError ? cause.message : 'Không thể gửi yêu cầu khôi phục mật khẩu lúc này.',
            );
        } finally {
            setIsForgotPasswordSubmitting(false);
        }
    }

    return (
        <>
            <Card className="w-full max-w-xl">
                <div className="mb-8 space-y-3">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Authentication</p>
                    <h1 className="text-4xl font-semibold">Đăng nhập</h1>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                    <Input
                        type="email"
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
                        placeholder="Email"
                    />
                    <div className="space-y-2">
                        <Input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Password"
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={openForgotPasswordPopup}
                                className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
                            >
                                Quen mat khau?
                            </button>
                        </div>
                    </div>
                    {errorLogin ? <FormMessage type="error" message={errorLogin} /> : null}
                    {status ? <FormMessage type="success" message={status} /> : null}
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
                    </Button>
                </form>

                {forgotPasswordStatus ? (
                    <FormMessage type="success" message={`Gửi thông báo đến tài khoản bạn ${forgotPasswordStatus}`} />
                ) : null}
                <p className="mt-6 text-sm text-[var(--muted)]">
                    Chua co tai khoan?{' '}
                    <Link href={APP_ROUTES.register} className="font-semibold text-[var(--accent)]">
                        Dang ky ngay
                    </Link>
                </p>
            </Card>

            {isForgotPasswordOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,33,45,0.45)] px-6 py-12"
                    onClick={closeForgotPasswordPopup}
                >
                    <Card className="w-full max-w-md rounded-[1.75rem]" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                                    Password Recovery
                                </p>
                                <h2 className="text-2xl font-semibold">Khôi phục mật khẩu</h2>
                                <p className="text-sm leading-6 text-[var(--muted)]">
                                    Nhập email để gửi yêu cầu khôi phục mật khẩu.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeForgotPasswordPopup}
                                className="text-xl leading-none text-[var(--muted)] transition hover:text-[var(--foreground)]"
                                aria-label="Dong popup quen mat khau"
                            >
                                x
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleForgotPasswordSubmit} noValidate>
                            <p>Email</p>
                            <Input
                                type="email"
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
                                placeholder="Email"
                            />
                            {forgotPasswordError ? <FormMessage type="error" message={forgotPasswordError} /> : null}
                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={closeForgotPasswordPopup}
                                    disabled={isForgotPasswordSubmitting}
                                >
                                    Đóng
                                </Button>
                                <Button type="submit" disabled={isForgotPasswordSubmitting}>
                                    {isForgotPasswordSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            ) : null}
        </>
    );
}
