import type { PropsWithChildren } from 'react';
import { Card } from '@/shared/ui/card';

export function SectionShell({
    eyebrow,
    title,
    description,
    children,
}: PropsWithChildren<{
    eyebrow: string;
    title: string;
    description: string;
}>) {
    return (
        <Card>
            <div className="mb-6 space-y-2">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--muted)]">{eyebrow}</p>
                <h2 className="text-3xl font-semibold">{title}</h2>
                <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">{description}</p>
            </div>
            {children}
        </Card>
    );
}
