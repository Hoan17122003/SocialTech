import Link from 'next/link';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { SectionShell } from '@/shared/ui/section-shell';

const highlights = [
    'App Router + route groups cho luong auth/workspace/marketing.',
    'Typed contracts theo backend DTOs, tach rieng theo feature auth, users, articles.',
    'HTTP client dung chung, co xu ly token, refresh flow va multipart form-data.',
    'Tai lieu kien truc FE duoc sinh ngay trong docs/discussion de team onboarding nhanh.',
];

export default function HomePage() {
    return (
        <main className="page-shell">
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
                <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-8">
                        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)] backdrop-blur">
                            Social Tech Frontend Base
                        </span>
                        <div className="space-y-5">
                            <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-[var(--foreground)] md:text-6xl">
                                Nen tang Next.js cho social platform duoc to chuc giong du an thuc te.
                            </h1>
                            <p className="max-w-3xl text-lg leading-8 text-[var(--muted)]">
                                Boilerplate nay duoc dung de khop voi backend hien tai: auth, user, article, common
                                response, token refresh va pattern module hoa de team phat trien tiep ma khong bi roi
                                vao mot codebase monolithic.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href={APP_ROUTES.login}
                                className="rounded-full bg-[var(--surface-inverse)] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                            >
                                Dang nhap
                            </Link>
                            <Link
                                href={APP_ROUTES.dashboard}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] backdrop-blur transition hover:bg-[var(--surface-strong)]"
                            >
                                Xem workspace
                            </Link>
                        </div>
                    </div>

                    <SectionShell
                        eyebrow="Architecture"
                        title="Nhung gi da duoc khoi tao san"
                        description="Cac khoi duoi day la skeleton san sang de team tich hop API thuc, state va UI business."
                    >
                        <div className="grid gap-3">
                            {highlights.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-3xl border border-[var(--line)] bg-white/75 px-5 py-4 text-sm leading-7 text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur-sm"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </SectionShell>
                </section>
            </div>
        </main>
    );
}
