'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/providers/chat-provider';
import type { ChatConversationSummary, DetailUserFollow } from '@/features/chat/contracts';
import { formatChatListTime } from '@/common/utils/format-date';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { AvatarImage } from '@/shared/ui/avatar-image';

type InboxPopoverProps = {
    onClose: () => void;
};

export function InboxPopover({ onClose }: InboxPopoverProps) {
    const {
        inbox,
        isLoadingInbox,
        openChat,
        openDirectChatWithUser,
        searchCandidates,
        refreshInbox,
    } = useChat();

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query, 300);
    const [candidates, setCandidates] = useState<DetailUserFollow[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Refresh inbox on popover open
    useEffect(() => {
        void refreshInbox();
    }, [refreshInbox]);

    // Perform candidate search when debouncedQuery changes
    useEffect(() => {
        const q = debouncedQuery.trim();
        if (!q) {
            return;
        }

        let active = true;
        void (async () => {
            setIsSearching(true);
            try {
                const results = await searchCandidates(q);
                if (active) {
                    setCandidates(results);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (active) {
                    setIsSearching(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [debouncedQuery, searchCandidates]);

    // Handle outside clicks to close the popover
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSelectConversation = async (conversation: ChatConversationSummary) => {
        await openChat(conversation.conversationKey);
        onClose();
    };

    const handleSelectCandidate = async (user: DetailUserFollow) => {
        await openDirectChatWithUser(user.id, user.displayName, user.avatar);
        onClose();
    };

    return (
        <div
            ref={popoverRef}
            className="absolute right-0 top-14 z-50 w-96 origin-top-right rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 shadow-2xl backdrop-blur-xl animate-fade-in-down focus:outline-none"
        >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Chats</h3>
                <button
                    type="button"
                    onClick={() => void refreshInbox()}
                    className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)] transition-colors"
                    title="Làm mới tin nhắn"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 16h5v5" />
                    </svg>
                </button>
            </div>

            {/* Search inputs */}
            <div className="mt-3 relative">
                <input
                    type="text"
                    value={query}
                    onChange={(event) => {
                        const nextQuery = event.target.value;
                        setQuery(nextQuery);

                        if (!nextQuery.trim()) {
                            setCandidates([]);
                            setIsSearching(false);
                        }
                    }}
                    placeholder="Tìm kiếm bạn bè..."
                    className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 pl-10 text-sm text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[rgba(204,95,61,0.35)] transition-all"
                />
                <span className="absolute left-3.5 top-3.5 text-[var(--muted)]">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                </span>
                {isSearching && (
                    <div className="pointer-events-none absolute right-3 top-3 h-4.5 w-4.5 animate-spin rounded-full border-2 border-[rgba(24,35,47,0.2)] border-t-[var(--accent)]" />
                )}
            </div>

            {/* Content areas */}
            <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1 space-y-2">
                {query.trim().length > 0 ? (
                    /* Search results */
                    <>
                        <p className="px-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                            Tìm kiếm kết quả
                        </p>
                        {candidates.length === 0 && !isSearching ? (
                            <div className="py-8 text-center text-sm text-[var(--muted)]">
                                Không tìm thấy bạn bè phù hợp (yêu cầu follow 2 chiều).
                            </div>
                        ) : (
                            candidates.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => void handleSelectCandidate(user)}
                                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 hover:bg-[var(--bg-hover)] text-left transition-all duration-200"
                                >
                                    <AvatarImage
                                        src={user.avatar}
                                        alt={user.displayName}
                                        fallback={user.displayName.charAt(0).toUpperCase()}
                                        sizes="44px"
                                        className="h-11 w-11 flex-shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface-strong)]"
                                        fallbackClassName="font-bold text-[var(--muted)] bg-gradient-to-tr from-orange-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                                            {user.displayName}
                                        </p>
                                        <p className="text-xs text-[var(--muted)]">Bấm để bắt đầu chat</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </>
                ) : (
                    /* Inbox Conversations */
                    <>
                        <div className="flex items-center justify-between px-2">
                            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                                Trò chuyện gần đây
                            </span>
                        </div>

                        {isLoadingInbox && inbox.length === 0 ? (
                            <div className="py-12 text-center text-sm text-[var(--muted)]">
                                Đang tải tin nhắn...
                            </div>
                        ) : inbox.length === 0 ? (
                            <div className="py-12 text-center text-sm text-[var(--muted)] flex flex-col items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="text-[var(--muted)] opacity-60"
                                >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <span>Chưa có cuộc trò chuyện nào.</span>
                                <span className="text-xs">Hãy tìm kiếm bạn bè để bắt đầu!</span>
                            </div>
                        ) : (
                            inbox.map((conversation) => {
                                const title =
                                    conversation.title ||
                                    (conversation.conversationType === 'Direct'
                                        ? `User ${conversation.otherUserId}`
                                        : `Community ${conversation.communityId}`);

                                return (
                                    <button
                                        key={conversation.conversationKey}
                                        type="button"
                                        onClick={() => void handleSelectConversation(conversation)}
                                        className="flex w-full items-start gap-3 rounded-2xl p-2.5 hover:bg-[var(--bg-hover)] text-left transition-all duration-200"
                                    >
                                        {/* Avatar placeholder/default */}
                                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-[var(--surface-strong)] border border-[var(--line)]">
                                            <div className="flex h-full w-full items-center justify-center font-bold text-[var(--accent)] bg-[var(--accent)]/5">
                                                {title.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                                                    {title}
                                                </p>
                                                <span className="text-xs text-[var(--muted)] flex-shrink-0">
                                                    {formatChatListTime(conversation.lastMessageAtUtc)}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-[var(--muted)] truncate">
                                                {conversation.lastMessagePreview || 'Chưa có tin nhắn'}
                                            </p>
                                            <span className="mt-1.5 inline-block text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
                                                {conversation.conversationType === 'Direct' ? 'Cá nhân' : 'Nhóm'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
