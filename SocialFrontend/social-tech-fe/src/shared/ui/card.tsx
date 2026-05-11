import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/common/utils/cn';

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] backdrop-blur-xl',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
