import Link from 'next/link';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { SectionShell } from '@/shared/ui/section-shell';
import { DISPLAYCONTENT } from '@/common/constants/display-const';

const highlights = [
    'App Router + route groups cho luồng auth/workspace/marketing.',
    'Typed contracts theo backend DTOs, tách riêng theo feature auth, users, articles.',
    'HTTP client dùng chung, có xử lý token, refresh flow và multipart form-data.',
    'Tài liệu kiến trúc FE được sinh ngay trong docs/discussion để team onboarding nhanh.',
];

export default function HomePage() {
    return (
        <main className="page-shell relative flex items-center justify-center min-h-[calc(100vh-4rem)]">
            {/* Ambient Floating Orbs */}
            <div className="pointer-events-none absolute top-[10%] left-[-5%] -z-10 h-[350px] w-[350px] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 blur-3xl animate-float-slow-1" />
            <div className="pointer-events-none absolute bottom-[15%] right-[-5%] -z-10 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-500/10 to-teal-500/20 blur-3xl animate-float-slow-2" />

            <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10 z-10">
                <section className="grid items-center gap-12 py-6 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Left Column: Hero info */}
                    <div className="space-y-8 flex flex-col justify-center">
                        <div className="animate-fade-in-down [animation-fill-mode:forwards]">
                            <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)] backdrop-blur shadow-[var(--shadow)] hover:border-[var(--line-hover)] transition-all">
                                {DISPLAYCONTENT.WEBDISPLAYNAME}
                            </span>
                        </div>

                        <div className="space-y-5">
                            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] md:text-5xl lg:text-6xl animate-fade-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                                {DISPLAYCONTENT.WEBDESCRIPTION.split(',').map((part, index) => (
                                    <span key={part} className={index === 0 ? "block mb-2" : "block text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 bg-[length:200%_auto] animate-[text-gradient_6s_linear_infinite]"}>
                                        {part}{index === 0 ? ',' : ''}
                                    </span>
                                ))}
                            </h1>
                            <p className="max-w-3xl text-base md:text-lg leading-relaxed text-[var(--muted)] animate-fade-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                                {DISPLAYCONTENT.AUTHORIMPL}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 animate-fade-in-up [animation-delay:600ms] opacity-0 [animation-fill-mode:forwards]">
                            <Link
                                href={APP_ROUTES.login}
                                className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4facfe] hover:from-[var(--accent-strong)] hover:to-[#00f2fe] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
                            >
                                Đăng nhập
                            </Link>
                            <Link
                                href={APP_ROUTES.dashboard}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-strong)] px-8 py-3.5 text-sm font-semibold text-[var(--foreground)] backdrop-blur shadow-sm hover:border-[var(--line-hover)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
                            >
                                Xem workspace
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Highlights cards list */}
                    <div className="animate-fade-in-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
                        <SectionShell
                            eyebrow="Architecture"
                            title="Những gì đã được khởi tạo sẵn"
                            description="Các khối dưới đây là skeleton sẵn sàng để team tích hợp API thực, state và UI business."
                        >
                            <div className="grid gap-4 mt-6">
                                {highlights.map((item, index) => (
                                    <div
                                        key={item}
                                        style={{ animationDelay: `${700 + index * 150}ms` }}
                                        className="group relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-6 py-5 text-sm leading-relaxed text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--line-hover)] hover:bg-[var(--surface-strong)] hover:shadow-lg dark:hover:shadow-indigo-500/5 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
                                    >
                                        {/* Status tech dot */}
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[var(--line)] transition-all duration-300 group-hover:scale-125 group-hover:bg-[var(--line-hover)] group-hover:shadow-[0_0_8px_var(--line-hover)]" />
                                        
                                        <div className="pr-4 relative z-10 flex items-center gap-3">
                                            <span className="font-mono text-xs text-[var(--muted)] opacity-60">0{index + 1}.</span>
                                            <span>{item}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionShell>
                    </div>
                </section>
            </div>
        </main>
    );
}
