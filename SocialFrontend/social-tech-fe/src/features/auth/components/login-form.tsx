'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { ApiError } from '@/common/types/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';
import { FormMessage } from '@/shared/ui/form-message';

export function LoginForm() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('demo@socialtech.local');
    const [password, setPassword] = useState('Password!12345');
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);
        setError(null);
        setIsSubmitting(true);

        try {
            await login(email, password);
            setStatus('Dang nhap thanh cong. Access token da duoc luu o client storage.');
            router.push(APP_ROUTES.dashboard);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Khong the dang nhap luc nay.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-xl">
            <div className="mb-8 space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Authentication</p>
                <h1 className="text-4xl font-semibold">Dang nhap vao workspace</h1>
                <p className="text-sm leading-7 text-[var(--muted)]">
                    Form nay map truc tiep toi `POST /api/Auth/login` va dung chung auth provider cho toan bo App
                    Router.
                </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                />
                <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                />
                {error ? <FormMessage type="error" message={error} /> : null}
                {status ? <FormMessage type="success" message={status} /> : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Dang xu ly...' : 'Dang nhap'}
                </Button>
            </form>

            <p className="mt-6 text-sm text-[var(--muted)]">
                Chua co tai khoan?{' '}
                <Link href={APP_ROUTES.register} className="font-semibold text-[var(--accent)]">
                    Dang ky ngay
                </Link>
            </p>
        </Card>
    );
}
