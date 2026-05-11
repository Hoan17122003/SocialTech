import Link from 'next/link';
import { ErrorLayout } from '@/shared/layout/error-layout';

export default function NotFound() {
    return (
        <ErrorLayout>
            <div className="flex flex-col items-center justify-center text-center">
                <h2 className="text-4xl font-bold text-accent">404</h2>
                <h3 className="mt-4 text-2xl font-semibold">Không tìm thấy trang</h3>
                <p className="mt-2 text-muted">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
                <Link
                    href="/"
                    className="mt-8 rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent-strong transition-colors"
                >
                    Quay lại trang chủ
                </Link>
            </div>
        </ErrorLayout>
    );
}
