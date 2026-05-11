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
            setStatus(response.message || 'Dang ky thanh cong.');
            setForm(initialState);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Khong the tao tai khoan luc nay.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-2xl">
            <div className="mb-8 space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">User Onboarding</p>
                <h1 className="text-4xl font-semibold">Tao tai khoan moi</h1>
                <p className="text-sm leading-7 text-[var(--muted)]">
                    Mapping den `POST /api/User/create`, giu cac field trung voi DTO backend de tranh lech contract giua
                    2 phia.
                </p>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <Input
                    value={form.username}
                    onChange={(event) => updateField('username', event.target.value)}
                    placeholder="Username"
                />
                <Input
                    value={form.displayName}
                    onChange={(event) => updateField('displayName', event.target.value)}
                    placeholder="Display name"
                />
                <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="Email"
                    className="md:col-span-2"
                />
                <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="Strong password"
                    className="md:col-span-2"
                />
                {error ? (
                    <div className="md:col-span-2">
                        <FormMessage type="error" message={error} />
                    </div>
                ) : null}
                {status ? (
                    <div className="md:col-span-2">
                        <FormMessage type="success" message={status} />
                    </div>
                ) : null}
                <div className="md:col-span-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--muted)]">
                        Da co tai khoan?{' '}
                        <Link href={APP_ROUTES.login} className="font-semibold text-[var(--accent)]">
                            Dang nhap
                        </Link>
                    </p>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Dang tao...' : 'Tao tai khoan'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
