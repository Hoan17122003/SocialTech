import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/common/utils/cn';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
    variant?: 'primary' | 'secondary' | 'ghost';
};

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]',
    secondary: 'border border-[var(--line)] bg-white/80 text-[var(--foreground)] hover:bg-white',
    ghost: 'bg-transparent text-[var(--foreground)] hover:bg-white/60',
};

export function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                variants[variant],
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
