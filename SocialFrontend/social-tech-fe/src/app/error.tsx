'use client';

import { useEffect } from 'react';
import { ErrorLayout } from '@/shared/layout/error-layout';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <ErrorLayout>
            <div className="flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-danger">Đã có lỗi xảy ra!</h2>
                <p className="mt-2 text-muted">Rất tiếc, đã có lỗi phát sinh trong quá trình xử lý.</p>
                <button
                    onClick={() => reset()}
                    className="mt-6 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-strong transition-colors"
                >
                    Thử lại
                </button>
            </div>
        </ErrorLayout>
    );
}
