import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="page-shell">
            <div className="mx-auto min-h-screen max-w-7xl px-6 py-6 lg:px-10">
                <div>{children}</div>
            </div>
        </div>
    );
}
