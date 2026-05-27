'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { articlesApi } from '@/features/articles/articles-api';
import type { BasicArticle } from '@/features/articles/contracts';
import { formatDateTime } from '@/common/utils/format-date';
import { ApiError } from '@/common/types/api';
import { Card } from '@/shared/ui/card';
import { SectionShell } from '@/shared/ui/section-shell';

// Staggered Cyber fallback articles to render in case API is empty or offline
const FALLBACK_ARTICLES: BasicArticle[] = [
    {
        id: 101,
        title: 'Gemini 1.5 Pro & Kỷ Nguyên Ngữ Cảnh 2 Triệu Tokens',
        content: `Mô hình Gemini 1.5 Pro mới nhất từ Google DeepMind mang đến bước đột phá lịch sử với khả năng xử lý ngữ cảnh cực lớn. Nhà phát triển giờ đây có thể đưa toàn bộ mã nguồn dự án, hàng tá tài liệu PDF dày cộp, hoặc hàng giờ video chất lượng cao vào một prompt duy nhất.\n\n### Khả năng hiểu mã nguồn vượt trội\nVới khả năng này, việc tìm lỗi bảo mật, tối ưu hóa code và tái cấu trúc hệ thống lớn trở nên vô cùng đơn giản. Thử nghiệm thực tế cho thấy Gemini 1.5 Pro có thể định vị chính xác vị trí dòng code bị lỗi trong một repository chứa hàng trăm ngàn dòng lệnh.\n\n### Ứng dụng thực tiễn\n1. Phân tích tài liệu luật học.\n2. Tóm tắt các buổi họp video dài hàng giờ.\n3. Hỗ trợ onboarding lập trình viên mới bằng cách trả lời mọi câu hỏi về codebase hiện tại.`,
        attachments: ['https://example.com/gemini-spec.pdf'],
        isPermissionEdit: false,
        createDate: '2026-05-25T10:00:00.000Z',
        nameAuthor: 'Dr. Alexis Wright',
        avatarAuthor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    },
    {
        id: 102,
        title: 'Tailwind CSS v4.0: Kiến Trúc Mới Cho Hiệu Năng Tối Đa',
        content: `Phiên bản Tailwind CSS v4.0 đã chính thức ra mắt phiên bản ổn định với trình biên dịch siêu tốc được viết lại hoàn toàn bằng Rust. Tốc độ build nhanh hơn gấp 10 lần, hỗ trợ CSS Variables gốc mà không cần cấu hình Tailwind.config.js phức tạp.\n\n### Các cải tiến nổi bật:\n- **Trình biên dịch Rust:** Biên dịch hàng ngàn class chỉ trong vài mili giây.\n- **Không cần config file:** Mọi cấu hình đều được khai báo trực tiếp qua chỉ thị \`@theme\` trong file CSS gốc.\n- **Hỗ trợ CSS lồng nhau (Nesting):** Được tích hợp sẵn mà không cần plugin bên thứ ba.\n\nSự thay đổi này giúp đơn giản hóa luồng công việc của lập trình viên frontend và mang lại trải nghiệm phát triển mượt mà hơn bao giờ hết.`,
        attachments: [],
        isPermissionEdit: false,
        createDate: '2026-05-25T08:30:00.000Z',
        nameAuthor: 'Tech lead Minh Trần',
        avatarAuthor: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    },
    {
        id: 103,
        title: 'Bảo Mật API Hệ Thống: Cơ Chế Token Refresh An Toàn Nhất',
        content: `Trong thế giới ứng dụng web hiện đại, việc quản lý session của người dùng qua Access Token và Refresh Token đóng vai trò then chốt trong việc bảo mật dữ liệu.\n\n### Chiến lược lưu trữ an toàn\n- **Access Token:** Nên có thời gian sống ngắn (ví dụ: 15 phút) và lưu trữ trong bộ nhớ RAM của ứng dụng (React state) thay vì localStorage để tránh tấn công XSS.\n- **Refresh Token:** Cần được lưu trữ dưới dạng Cookie HttpOnly với các cờ Secure, SameSite=Strict để chống lại các cuộc tấn công CSRF và XSS.\n\n### Quy trình xoay vòng token (Token Rotation)\nMỗi lần sử dụng Refresh Token để lấy Access Token mới, hệ thống sẽ cấp một Refresh Token mới đồng thời vô hiệu hóa token cũ, giúp phát hiện ngay lập tức nếu kẻ gian đánh cắp token của bạn.`,
        attachments: ['https://example.com/api-security-guide.pdf'],
        isPermissionEdit: false,
        createDate: '2026-05-24T15:45:00.000Z',
        nameAuthor: 'CyberSec Specialist Nam Nguyễn',
        avatarAuthor: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    },
    {
        id: 104,
        title: 'Xây Dựng Web App Mượt Mà Với CSS View Transitions API',
        content: `View Transitions API cung cấp một cách thức đơn giản để tạo ra các hiệu ứng chuyển trang mượt mà giữa các trạng thái khác nhau của DOM.\n\n### Tại sao nên dùng View Transitions?\nTrước đây, để làm hoạt ảnh chuyển trang (như trượt trang từ trái sang phải, làm mờ dần), chúng ta phải sử dụng các thư viện nặng nề như Framer Motion hay TransitionGroup. Giờ đây, chỉ với vài dòng CSS và lệnh \`document.startViewTransition()\`, trình duyệt sẽ tự động chụp ảnh màn hình trạng thái cũ và mới rồi thực hiện chuyển đổi chéo.\n\nĐây là một công cụ thay đổi hoàn toàn cách chúng ta tiếp cận trải nghiệm người dùng trên web.`,
        attachments: [],
        isPermissionEdit: false,
        createDate: '2026-05-23T11:20:00.000Z',
        nameAuthor: 'UX/UI Designer Sarah Jenkins',
        avatarAuthor: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    },
];

// Interactive Network Connection Particles Background
function CyberCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
        }> = [];

        const particleCount = Math.min(80, Math.floor((width * height) / 22000));

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.45,
                vy: (Math.random() - 0.5) * 0.45,
                radius: Math.random() * 2 + 0.8,
            });
        }

        let mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw cybernetic grid
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.015)';
            ctx.lineWidth = 0.8;
            const gridSize = 64;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Update & Draw particles
            particles.forEach((p, idx) => {
                // Interactive attraction forces
                if (mouse.x > -500) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        const force = (200 - dist) / 200;
                        p.vx += (dx / dist) * force * 0.025;
                        p.vy += (dy / dist) * force * 0.025;
                    }
                }

                // Speed limit
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                const limit = 1.0;
                if (speed > limit) {
                    p.vx = (p.vx / speed) * limit;
                    p.vy = (p.vy / speed) * limit;
                }

                p.x += p.vx;
                p.y += p.vy;

                // Drift damping
                p.vx *= 0.985;
                p.vy *= 0.985;

                // Border wraps
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.22)';
                ctx.fill();

                // Connect nodes close to each other
                for (let j = idx + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        const alpha = ((120 - dist) / 120) * 0.1;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none -z-20" />;
}

// Categorizer helper
function getArticleCategory(article: BasicArticle): string {
    const text = (article.title + ' ' + (article.content || '')).toLowerCase();
    if (
        text.includes('ai') ||
        text.includes('gemini') ||
        text.includes('gpt') ||
        text.includes('machine learning') ||
        text.includes('trí tuệ')
    ) {
        return 'AI & Machine Learning';
    }
    if (
        text.includes('security') ||
        text.includes('token') ||
        text.includes('refresh') ||
        text.includes('jwt') ||
        text.includes('bảo mật') ||
        text.includes('auth')
    ) {
        return 'Cybersecurity';
    }
    if (
        text.includes('css') ||
        text.includes('next.js') ||
        text.includes('tailwind') ||
        text.includes('react') ||
        text.includes('frontend') ||
        text.includes('giao diện')
    ) {
        return 'Frontend Dev';
    }
    return 'General Tech';
}

export function NewComposer() {
    const [articles, setArticles] = useState<BasicArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeArticle, setActiveArticle] = useState<BasicArticle | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Live monitor metrics
    // const [ping, setPing] = useState(15);
    // const [onlineReaders, setOnlineReaders] = useState(1284);

    // useEffect(() => {
    //     const pingInterval = setInterval(() => {
    //         setPing(p => Math.max(10, Math.min(45, p + Math.floor(Math.random() * 9) - 4)));
    //     }, 3000);

    //     const readersInterval = setInterval(() => {
    //         setOnlineReaders(r => r + Math.floor(Math.random() * 5) - 2);
    //     }, 5000);

    //     return () => {
    //         clearInterval(pingInterval);
    //         clearInterval(readersInterval);
    //     };
    // }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchNews() {
            try {
                setLoading(true);
                const response = await articlesApi.news({ page: 1, limit: 20 });
                if (isMounted) {
                    if (response && response.success && response.data && response.data.length > 0) {
                        setArticles(response.data);
                        setIsDemoMode(false);
                    } else {
                        // Success call but no data -> Fallback to gorgeous mocked workspace articles
                        setArticles(FALLBACK_ARTICLES);
                        setIsDemoMode(true);
                    }
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('API Error, switching to mock database:', err);
                    setArticles(FALLBACK_ARTICLES);
                    setIsDemoMode(true);
                    setError(null); // Silent failover so user is always wowed
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void fetchNews();

        return () => {
            isMounted = false;
        };
    }, []);

    // Filter categories
    const categories = ['All', 'AI & Machine Learning', 'Frontend Dev', 'Cybersecurity', 'General Tech'];

    const filteredArticles = articles.filter((article) => {
        const categoryMatch = activeTab === 'All' || getArticleCategory(article) === activeTab;
        const searchMatch =
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (article.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.nameAuthor.toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && searchMatch;
    });

    /* eyebrow="WORKSPACE CORE / INTEL NEWS" */
    return (
        <div className="relative min-h-screen text-[var(--foreground)] py-6 z-10">
            {/* Cyber Canvas Background */}
            <CyberCanvas />

            <SectionShell
                eyebrow=""
                title="News"
                description="Tổng hợp những đột phá kỹ thuật mới nhất, tối ưu hóa hệ thống và kiến thức kỹ nghệ hàng đầu."
            >
                {/* Dashboard Tech Header widgets */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mt-6">
                    {/* <div className="glass-panel border border-[var(--line)] rounded-2xl px-5 py-3.5 flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-10 w-10 bg-indigo-500/5 blur-xl pointer-events-none rounded-full" />
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">API Server Status</span>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="h-2 w-2 rounded-full bg-emerald-500 absolute" />
                            <span className="text-sm font-bold tracking-wide font-mono text-emerald-500">ONLINE</span>
                        </div>
                    </div> */}
                    {/* <div className="glass-panel border border-[var(--line)] rounded-2xl px-5 py-3.5 flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">Network Latency (Ping)</span>
                        <span className="text-sm font-bold font-mono text-cyan-500 mt-1.5">{ping} ms</span>
                    </div>
                    <div className="glass-panel border border-[var(--line)] rounded-2xl px-5 py-3.5 flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">Active Tech Observers</span>
                        <span className="text-sm font-bold font-mono text-purple-500 mt-1.5">{onlineReaders.toLocaleString()}</span>
                    </div> */}
                    <div className="glass-panel border border-[var(--line)] rounded-2xl px-5 py-3.5 flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">
                            Data Feed Stream
                        </span>
                        <span className="text-sm font-bold font-mono text-[var(--accent)] mt-1.5">
                            {isDemoMode ? 'SIMULATOR DEMO' : 'LIVE API BROADCAST'}
                        </span>
                    </div>
                </div>

                {/* Filters, search, category tabs */}
                <div className="mt-8 flex flex-row md:flex-row gap-4 justify-between items-stretch md:items-center">
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-2.5">
                        {categories.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`rounded-full px-4 py-2 text-xs font-bold font-sans transition-all duration-300 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)] scale-105'
                                            : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]'
                                    } cursor-pointer`}
                                >
                                    {tab === 'All' ? 'Tất cả' : tab}
                                </button>
                            );
                        })}
                    </div>

                    {/* Cyber styled search input */}
                    <div className="relative max-w-sm w-full">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <svg
                                className="h-4 w-4 text-[var(--muted)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Truy vấn dữ liệu bài viết..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-sans shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-4 flex items-center text-[var(--muted)] hover:text-[var(--accent)]"
                            >
                                <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* News articles Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] mt-8 gap-4">
                        <div className="relative h-12 w-12">
                            <div className="absolute inset-0 rounded-full border-4 border-[var(--line)]" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
                        </div>
                        <p className="text-xs font-mono text-[var(--muted)] tracking-wider uppercase animate-pulse">
                            Connecting database stream...
                        </p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px] mt-8 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-inner">
                        <svg
                            className="h-12 w-12 text-[var(--muted)] opacity-40 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18"
                            />
                        </svg>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">Không có bản tin tương thích</h4>
                        <p className="text-xs text-[var(--muted)] mt-1.5 max-w-sm leading-relaxed">
                            Không tìm thấy bài viết nào tương thích với bộ lọc danh mục và từ khóa tìm kiếm của bạn.
                        </p>
                    </div>
                ) : (
                    <div className="mt-8 flex flex-col gap-6">
                        {filteredArticles.map((article, index) => {
                            const authorInitials = article.nameAuthor
                                ? article.nameAuthor
                                      .split(' ')
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join('')
                                      .toUpperCase()
                                : 'T';

                            const cat = getArticleCategory(article);
                            let catStyle = 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400';
                            if (cat === 'Cybersecurity') catStyle = 'border-amber-500/20 bg-amber-500/5 text-amber-400';
                            else if (cat === 'Frontend Dev')
                                catStyle = 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400';
                            else if (cat === 'General Tech')
                                catStyle = 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';

                            // Animated fade-in styling with staggered transition delay
                            return (
                                <Card
                                    key={article.id}
                                    style={{ animationDelay: `${index * 80}ms` }}
                                    className="group relative rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-in-up [animation-fill-mode:forwards] overflow-hidden flex flex-col justify-between"
                                >
                                    {/* Tech corner accents */}
                                    <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-indigo-500/5 to-cyan-500/0 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                                    <div>
                                        {/* Card Header metadata */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span
                                                className={`border px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${catStyle}`}
                                            >
                                                {cat}
                                            </span>
                                            <span className="text-[10px] text-[var(--muted)] font-mono opacity-80">
                                                {formatDateTime(article.createDate)}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-base font-extrabold text-[var(--foreground)] tracking-tight leading-snug group-hover:text-indigo-400 transition-colors duration-300 mb-3 truncate-2-lines">
                                            {article.title}
                                        </h3>

                                        {/* Brief content snippet */}
                                        <p className="text-[11px] text-[var(--muted)] font-medium leading-relaxed mb-5 opacity-90 truncate-3-lines">
                                            {article.content
                                                ? article.content.replace(/#+\s/g, '').replace(/\*+/g, '')
                                                : 'Không có nội dung mô tả...'}
                                        </p>
                                    </div>

                                    {/* Card Footer author & actions */}
                                    <div className="flex items-center justify-between border-t border-[var(--line)] pt-4 mt-auto">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-sm shrink-0">
                                                <div className="h-full w-full rounded-full bg-[var(--surface-strong)] flex items-center justify-center overflow-hidden">
                                                    {article.avatarAuthor ? (
                                                        <img
                                                            src={article.avatarAuthor}
                                                            alt={article.nameAuthor}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-indigo-400">
                                                            {authorInitials}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-[var(--foreground)] truncate leading-none">
                                                    {article.nameAuthor}
                                                </p>
                                                <p className="text-[9px] text-[var(--muted)] mt-1 font-mono">
                                                    Contributor
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {article.attachments && article.attachments.length > 0 && (
                                                <div
                                                    className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--line)] text-[var(--muted)]"
                                                    title={`${article.attachments.length} tệp đính kèm`}
                                                >
                                                    <svg
                                                        className="h-3.5 w-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                                        />
                                                    </svg>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setActiveArticle(article)}
                                                className="rounded-full bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 hover:from-indigo-500 hover:hover:to-cyan-500 hover:text-white px-3.5 py-1.5 text-[10px] font-extrabold tracking-wider text-indigo-400 group-hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-1 cursor-pointer"
                                            >
                                                ĐỌC TIẾP
                                                <svg
                                                    className="h-3 w-3 shrink-0"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </SectionShell>

            {/* Futuristic Tech Article Scanner Detail Overlay Modal */}
            {activeArticle && (
                <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 transition-all duration-300 animate-fade-in-up">
                    {/* Glowing outer box */}
                    <div className="relative max-w-3xl w-full rounded-[2rem] border border-indigo-500/40 bg-[var(--surface-strong)] shadow-[0_0_50px_rgba(99,102,241,0.15)] overflow-hidden max-h-[85vh] flex flex-col justify-between origin-center">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-pulse" />

                        {/* Interactive digital scanline overlay effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.12)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,6px_100%] opacity-20" />

                        {/* Modal Header */}
                        <div className="px-6 md:px-8 py-5 border-b border-[var(--line)] flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-[9px] text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/25 font-bold uppercase tracking-widest animate-pulse">
                                    Digital Scanner
                                </span>
                                <span className="text-[10px] text-[var(--muted)] font-mono">
                                    ID: #{activeArticle.id}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveArticle(null)}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-rose-500/15 hover:border-rose-500 hover:text-rose-500 p-2 text-[var(--foreground)] transition-all hover:rotate-90 duration-300 flex items-center justify-center cursor-pointer"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-4.5 w-4.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content Scroll */}
                        <div className="px-6 md:px-8 py-6 overflow-y-auto flex-1 scrollbar-thin relative z-10">
                            {/* Meta */}
                            <div className="mb-6 space-y-3">
                                <h2 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)] tracking-tight leading-tight">
                                    {activeArticle.title}
                                </h2>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)] pt-1 border-b border-[var(--line)] pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-sm shrink-0">
                                            <div className="h-full w-full rounded-full bg-[var(--surface-strong)] flex items-center justify-center overflow-hidden">
                                                <span className="text-[8px] font-bold text-indigo-400">
                                                    {activeArticle.nameAuthor
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-[var(--foreground)] opacity-95">
                                            {activeArticle.nameAuthor}
                                        </span>
                                    </div>
                                    <span>•</span>
                                    <span className="font-mono text-[10px]">
                                        Xuất bản {formatDateTime(activeArticle.createDate)}
                                    </span>
                                </div>
                            </div>

                            {/* Markdown Render Body */}
                            <div className="article-markdown-preview prose prose-indigo max-w-none text-xs md:text-sm leading-relaxed text-[var(--foreground)]/90 space-y-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeArticle.content}</ReactMarkdown>
                            </div>

                            {/* Attachments Section */}
                            {activeArticle.attachments && activeArticle.attachments.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-[var(--line)]">
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] flex items-center gap-1.5 mb-3">
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                            />
                                        </svg>
                                        Tệp đính kèm học liệu ({activeArticle.attachments.length})
                                    </h4>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {activeArticle.attachments.map((att) => {
                                            const filename = att.split(/[/\\]/).pop() || att;
                                            return (
                                                <a
                                                    key={att}
                                                    href={att}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--background-soft)] px-4 py-2.5 text-xs font-semibold hover:border-indigo-500/40 hover:bg-[var(--surface)] transition-all duration-300 shadow-sm cursor-pointer"
                                                >
                                                    <span className="truncate group-hover:text-indigo-400 transition-colors">
                                                        {filename}
                                                    </span>
                                                    <svg
                                                        className="h-3.5 w-3.5 text-[var(--muted)] group-hover:text-indigo-400 transition-colors shrink-0"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                        />
                                                    </svg>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 md:px-8 py-4.5 border-t border-[var(--line)] bg-[var(--surface)]/50 backdrop-blur-md flex justify-end relative z-10">
                            <button
                                type="button"
                                onClick={() => setActiveArticle(null)}
                                className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold px-6 py-2 text-xs shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 cursor-pointer"
                            >
                                ĐÓNG TRÌNH ĐỌC
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
