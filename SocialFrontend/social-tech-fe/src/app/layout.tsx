import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import { AppProvider } from '@/providers/app-provider';
import { AppHeader } from '@/shared/navigation/app-header';
import { FloatingChatContainer } from '@/features/chat/components/floating-chat-container';
import './globals.css';
import '@uiw/react-md-editor/markdown-editor.css';

// Font sans (heading, UI text)
const manrope = Manrope({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'], // thêm nhiều weight để dùng linh hoạt
});

// Font mono (body hoặc code)
const ibmPlexMono = IBM_Plex_Mono({
    variable: '--font-mono',
    subsets: ['latin'],
    weight: ['400', '500', '600'], // thêm weight cần thiết
});

export const metadata: Metadata = {
    title: 'Social Tech Frontend',
    description: 'Base frontend for Social Tech using Next.js App Router.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`} suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var saved = localStorage.getItem('theme');
                                    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className="min-h-full font-sans bg-background text-foreground">
                <AppProvider>
                    <AppHeader />
                    {children}
                    <FloatingChatContainer />
                </AppProvider>
            </body>
        </html>
    );
}
