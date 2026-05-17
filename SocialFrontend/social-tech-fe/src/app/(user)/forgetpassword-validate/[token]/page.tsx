'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { ApiError } from '@/common/types/api';
import { usersApi } from '@/features/users/users-api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';

function validatePassword(password: string, confirmPassword: string) {
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword) {
        return 'Vui long nhap mat khau moi.';
    }

    if (trimmedPassword.length < 8) {
        return 'Mat khau moi can it nhat 8 ky tu.';
    }

    if (!trimmedConfirmPassword) {
        return 'Vui long xac nhan mat khau moi.';
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
        return 'Mat khau xac nhan khong trung khop.';
    }

    return null;
}

export default function ForgetPasswordValidatePage() {
    const params = useParams<{ token: string }>();
    const router = useRouter();
    const token = useMemo(() => {
        const rawToken = params?.token;
        return typeof rawToken === 'string' ? decodeURIComponent(rawToken) : '';
    }, [params]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!token) {
            setError('Token khong hop le hoac khong ton tai trong URL.');
            return;
        }

        const validationMessage = validatePassword(password, confirmPassword);

        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        setIsSubmitting(true);

        try {
            await usersApi.resetForgotPassword({
                token,
                newPassword: password.trim(),
            });
            router.push(APP_ROUTES.home);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Khong the doi mat khau luc nay.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="page-shell flex min-h-screen items-center justify-center px-6 py-12">
            <Card className="w-full max-w-xl">
                <div className="mb-8 space-y-3">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                        Password Recovery
                    </p>
                    <h1 className="text-4xl font-semibold">Nhập mật khẩu mới</h1>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                        Token duoc lay truc tiep tu URL va gui len backend de xac nhan yeu cau doi mat khau.
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                    <Input
                        type="password"
                        value={password}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            if (error) {
                                setError(null);
                            }
                        }}
                        placeholder="Mat khau moi"
                    />
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => {
                            setConfirmPassword(event.target.value);
                            if (error) {
                                setError(null);
                            }
                        }}
                        placeholder="Xac nhan mat khau moi"
                    />
                    {error ? <FormMessage type="error" message={error} /> : null}
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Dang cap nhat...' : 'Xac nhan doi mat khau'}
                    </Button>
                </form>
            </Card>
        </main>
    );
}
