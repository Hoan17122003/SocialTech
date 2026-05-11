import React from 'react';

export function ErrorLayout({ children }: React.PropsWithChildren) {
    return (
        <div className="page-shell">
            <div className="mx-auto min-h-screen max-w-7xl px-6 py-6 lg:px-10">
                <div className="mt-8">{children}</div>
            </div>
        </div>
    );
}
