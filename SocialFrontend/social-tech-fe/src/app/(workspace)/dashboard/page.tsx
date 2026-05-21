import Link from 'next/link';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { SectionShell } from '@/shared/ui/section-shell';

const modules = [
    {
        title: 'Authentication',
        description: 'Đăng nhập, đăng xuất, gia hạn access token tự động và duy trì phiên client-side bảo mật cao.',
        route: APP_ROUTES.login,
        icon: (
            <svg className="h-6 w-6 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5 4a3 3 0 11-6 0 3 3 0 016 0zm6 2.755V17a2 2 0 01-2 2H4a2 2 0 01-2-2v-4.245a8 8 0 0116 0z" />
            </svg>
        ),
        badge: 'POST /api/User/login',
    },
    {
        title: 'User Profile',
        description: 'Truy xuất hồ sơ cá nhân, cập nhật thông tin hiển thị, ảnh đại diện multipart và quản lý danh sách theo dõi.',
        route: '/profile',
        icon: (
            <svg className="h-6 w-6 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 2.667-.3 4-1" />
            </svg>
        ),
        badge: 'POST /api/User/profile/update',
    },
    {
        title: 'Article Engine',
        description: 'Trình soạn thảo bài viết tối tân hỗ trợ chế độ thường/công nghệ (Standard/Tech), quản lý file đính kèm đa phương tiện.',
        route: APP_ROUTES.createArticle,
        icon: (
            <svg className="h-6 w-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
        ),
        badge: 'POST /api/Article/create',
    },
];

export default function DashboardPage() {
    return (
        <div className="grid gap-10 animate-fade-in-up">
            <SectionShell
                eyebrow="Workspace / Dashboard"
                title="Hệ thống Frontend & API Mockup đã sẵn sàng"
                description="Khu vực quản trị và điều phối các tính năng chính của hệ thống SocialTech, tích hợp sẵn các giao thức kết nối dữ liệu mẫu."
            >
                <div className="grid gap-6 md:grid-cols-3 mt-4">
                    {modules.map((module) => (
                        <Link 
                            href={module.route}
                            key={module.title}
                            className="glow-card group block rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] relative overflow-hidden cursor-pointer"
                        >
                            {/* Accent Glow backdrop */}
                            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-[var(--accent)]/5 blur-2xl transition-all duration-300 group-hover:scale-125" />
                            
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="p-3 rounded-2xl bg-[var(--background-soft)] border border-[var(--line)] group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/10 transition-colors duration-300">
                                    {module.icon}
                                </div>
                                <span className="font-mono text-[9px] text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors border border-[var(--line)] rounded-full px-2.5 py-0.5 bg-[var(--background-soft)]">
                                    {module.badge}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-300">
                                {module.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors duration-300">
                                {module.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </SectionShell>

            <SectionShell
                eyebrow="Quick Navigation"
                title="Lối đi tắt nhanh điều hướng"
                description="Các liên kết trực tiếp giúp bạn nhanh chóng di chuyển đến các trang giao diện đại diện để thử nghiệm hệ thống."
            >
                <div className="flex flex-wrap gap-3.5 mt-2">
                    <Link
                        href={APP_ROUTES.register}
                        className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l3 3m0 0l-3 3m3-3H8m-5 1a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Tạo tài khoản mới
                    </Link>
                    
                    <Link
                        href={APP_ROUTES.createArticle}
                        className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Viết bài viết mới
                    </Link>
                    
                    <Link
                        href="/profile/1"
                        className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Trang hồ sơ mẫu
                    </Link>
                    
                    <Link
                        href="/articles/1"
                        className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Chi tiết bài viết mẫu
                    </Link>
                </div>
            </SectionShell>
        </div>
    );
}
