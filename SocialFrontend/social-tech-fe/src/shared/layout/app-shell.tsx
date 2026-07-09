'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { APP_ROUTES } from '@/common/constants/app-routes';

export function AppShell({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const items = [
        {
            href: '/',
            label: 'Trang chủ',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            ),
            color: 'hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600',
        },
        {
            href: APP_ROUTES.dashboard,
            label: 'Workspace / Dashboard',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
                    />
                </svg>
            ),
            color: 'hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600',
        },
        {
            href: '/profile',
            label: 'Trang cá nhân (Profile)',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            ),
            color: 'hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600',
        },
        {
            href: '/news',
            label: 'Tin tức công nghệ',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14"
                    />
                </svg>
            ),
            color: 'hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600',
        },
        {
            href: APP_ROUTES.createArticle,
            label: 'Tạo bài viết mới',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                </svg>
            ),
            color: 'hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600',
        },
        {
            href: APP_ROUTES.featureHand,
            label: 'Feature Hand',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 11V7a2 2 0 114 0v4m0 0V5a2 2 0 114 0v6m-8 0V9a2 2 0 114 0v2m0 0a2 2 0 114 0v1a8 8 0 01-8 8H9a5 5 0 01-5-5v-1a2 2 0 114 0v1"
                    />
                </svg>
            ),
            color: 'hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600',
        },
    ];

    return (
        <div className="page-shell">
            <div className="mx-auto min-h-screen max-w-7xl px-6 py-6 lg:px-10">
                <div>{children}</div>
            </div>

            {/* Floating Action Menu Button */}
            <div className="fixed bottom-6 left-6 z-50 flex flex-start ">
                <div
                    className={`fab-container ${isOpen ? 'is-open' : ''}`}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                >
                    {/* 
                        Cascading actions:
                        - FAB đang nằm bên trái màn hình, nên tooltip phải bung sang phải để không bị tràn ra ngoài viewport.
                        - CSS .fab-container trong globals.css chịu trách nhiệm mở/đóng speed-dial bằng hover hoặc class is-open.
                        - group-hover ở từng item giúp chỉ hiện đúng label của nút con đang được hover, không bật tất cả label cùng lúc.
                    */}
                    {items.map((item) => (
                        <div key={item.href} className="fab-item group relative flex items-center gap-2">
                            {/* Tooltip Label: left-14 đặt label ở phía bên phải nút tròn vì FAB đặt ở góc trái. */}
                            <span className="pointer-events-none absolute left-14 scale-90 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 rounded-xl bg-gray-900/90 dark:bg-white/95 px-3 py-1.5 text-xs font-semibold text-white dark:text-gray-900 shadow-md whitespace-nowrap">
                                {item.label}
                            </span>

                            {/* Circle shortcut button */}
                            <Link
                                href={item.href}
                                className={`flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-lg backdrop-blur-md transition-all duration-300 ${item.color} hover:scale-110 active:scale-95`}
                            >
                                {item.icon}
                            </Link>
                        </div>
                    ))}

                    {/* Main Action Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4facfe] text-white shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-indigo-500/40 relative z-10 cursor-pointer"
                    >
                        {/* Plus icon that rotates when menu is open */}
                        <svg
                            className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
