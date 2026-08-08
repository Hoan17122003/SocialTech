import type { BasicArticle } from '@/features/articles/contracts';
import type { Reaction } from './types';

export const NEWS_CATEGORIES = ['All', 'AI & Machine Learning', 'Frontend Dev', 'Cybersecurity', 'General Tech'];
export const REACTIONS: readonly Reaction[] = ['👍', '❤️', '😂', '😮'];

export const FALLBACK_ARTICLES: BasicArticle[] = [
    {
        id: 101,
        title: 'Gemini 1.5 Pro & Kỷ Nguyên Ngữ Cảnh 2 Triệu Tokens',
        content: 'Mô hình Gemini 1.5 Pro mới nhất từ Google DeepMind mang đến bước đột phá lịch sử với khả năng xử lý ngữ cảnh cực lớn. Nhà phát triển giờ đây có thể đưa toàn bộ mã nguồn dự án, hàng tá tài liệu PDF dày cộp, hoặc hàng giờ video chất lượng cao vào một prompt duy nhất.',
        attachments: ['https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80', 'https://example.com/gemini-spec.pdf'],
        isPermissionEdit: false,
        createDate: '2026-05-25T10:00:00.000Z',
        nameAuthor: 'Dr. Alexis Wright',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 102,
        title: 'Tailwind CSS v4.0: Kiến Trúc Mới Cho Hiệu Năng Tối Đa',
        content: 'Phiên bản Tailwind CSS v4.0 đã chính thức ra mắt với trình biên dịch siêu tốc, hỗ trợ CSS Variables gốc và workflow gọn hơn cho đội frontend.',
        attachments: ['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80'],
        isPermissionEdit: false,
        createDate: '2026-05-25T08:30:00.000Z',
        nameAuthor: 'Tech lead Minh Trần',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 103,
        title: 'Bảo Mật API Hệ Thống: Cơ Chế Token Refresh An Toàn Nhất',
        content: 'Trong ứng dụng web hiện đại, việc quản lý session qua Access Token và Refresh Token đóng vai trò then chốt trong việc bảo vệ dữ liệu người dùng.',
        attachments: ['https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=1200&q=80', 'https://example.com/api-security-guide.pdf'],
        isPermissionEdit: false,
        createDate: '2026-05-24T15:45:00.000Z',
        nameAuthor: 'CyberSec Specialist Nam Nguyễn',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    },
    {
        id: 104,
        title: 'Một cập nhật ngắn từ cộng đồng Social Tech',
        content: '',
        attachments: [],
        isPermissionEdit: true,
        createDate: '2026-05-23T11:20:00.000Z',
        nameAuthor: 'Bạn',
        publicIdAuthor: '10000000-0000-0000-0000-000000000001',
        avatarAuthor: '',
    },
];
