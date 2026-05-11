import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/common/utils/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                'w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]',
                className,
            )}
            {...props}
        />
    );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                'min-h-36 w-full rounded-3xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]',
                className,
            )}
            {...props}
        />
    );
}
