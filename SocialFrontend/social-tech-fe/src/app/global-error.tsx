'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center">
                    <div>
                        <h1>App crashed</h1>
                        <button onClick={reset}>Reload</button>
                    </div>
                </div>
            </body>
        </html>
    );
}
