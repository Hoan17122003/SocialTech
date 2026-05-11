export function FormMessage({ type, message }: { type: 'error' | 'success'; message: string }) {
    return (
        <p
            className={`rounded-2xl px-4 py-3 text-sm ${
                type === 'error' ? 'bg-red-50 text-[var(--danger)]' : 'bg-emerald-50 text-[var(--success)]'
            }`}
        >
            {message}
        </p>
    );
}
