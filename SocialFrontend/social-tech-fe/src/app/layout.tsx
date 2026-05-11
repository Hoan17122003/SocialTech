// import type { Metadata } from 'next';
// import { IBM_Plex_Mono, Manrope } from 'next/font/google';
// import { AppProvider } from '@/providers/app-provider';
// import './globals.css';

// const manrope = Manrope({
//     variable: '--font-sans',
//     subsets: ['latin'],
// });

// const ibmPlexMono = IBM_Plex_Mono({
//     variable: '--font-mono',
//     weight: ['400', '500'],
//     subsets: ['latin'],
// });

// export const metadata: Metadata = {
//     title: 'Social Tech Frontend',
//     description: 'Base frontend for Social Tech using Next.js App Router.',
// };

// export default function RootLayout({
//     children,
// }: Readonly<{
//     children: React.ReactNode;
// }>) {
//     return (
//         <html lang="vi" className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}>
//             <body className="min-h-full">
//                 <AppProvider>{children}</AppProvider>
//             </body>
//         </html>
//     );
// }

import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import { AppProvider } from '@/providers/app-provider';
import { AppHeader } from '@/shared/navigation/app-header';
import './globals.css';

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
        <html lang="vi" className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}>
            <body className="min-h-full font-sans bg-background text-foreground">
                <AppProvider>
                    <AppHeader />
                    {children}
                </AppProvider>
            </body>
        </html>
    );
}
