export function NewsNotice({ message }: { message: string | null }) {
    if (!message) return null;
    return <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-xl">{message}</div>;
}
