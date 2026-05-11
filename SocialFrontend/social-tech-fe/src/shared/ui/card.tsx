import type { PropsWithChildren } from 'react';
import { cn } from '@/common/utils/cn';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <div
            className={cn(
                'rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] backdrop-blur-xl',
                className,
            )}
        >
            {children}
        </div>
    );
}
