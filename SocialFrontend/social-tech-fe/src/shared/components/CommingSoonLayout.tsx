import Link from 'next/link';

type ComingSoonLayoutProps = {
    title?: string;
    description?: string;
};

export default function ComingSoonLayout({
    title = 'Coming soon',
    description = 'Tính năng này đang được phát triển và sẽ sớm ra mắt.',
}: ComingSoonLayoutProps) {
    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-6 text-white">
            <section className="max-w-xl text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    🚧
                </div>

                <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-neutral-400">Stay tuned</p>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>

                <p className="mt-4 text-base leading-7 text-neutral-300">{description}</p>

                <div className="mt-8 flex justify-center gap-3">
                    <Link
                        href="/"
                        className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium 
               text-white bg-black transition-colors duration-300 
               hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                    >
                        Về trang chủ
                    </Link>

                    <Link
                        href="/contact"
                        className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium 
               text-white bg-black transition-colors duration-300 
               hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                    >
                        Liên hệ
                    </Link>
                </div>
            </section>
        </main>
    );
}
