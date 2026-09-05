'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/providers/chat-provider';
import { useAuth } from '@/providers/auth-provider';
import type { ChatMessage } from '@/features/chat/contracts';
import { formatChatMessageTime } from '@/common/utils/format-date';

type FloatingChatBoxProps = {
    conversationKey: string;
};

function getUserIdFromToken(token: string | null) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // Decode base64url safely
        const payloadDecoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadDecoded);
        const userId =
            payload.sub ||
            payload.nameid ||
            payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        return userId ? String(userId) : null;
    } catch (err) {
        console.error('Error decoding JWT token:', err);
        return null;
    }
}

export function FloatingChatBox({ conversationKey }: FloatingChatBoxProps) {
    const { accessToken } = useAuth();
    const currentUserId = useMemo(() => getUserIdFromToken(accessToken), [accessToken]);

    const {
        inbox,
        messages,
        isLoadingMessages,
        draftConversations,
        sendMessage,
        editMessage,
        deleteMessage,
        setNickName,
        closeChat,
    } = useChat();

    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [defaultReaction, setDefaultReaction] = useState('👍');
    const [openOptionsMessageId, setOpenOptionsMessageId] = useState<string | null>(null);
    const [optionsPlacement, setOptionsPlacement] = useState<{
        vertical: 'top' | 'bottom';
        horizontal: 'left' | 'right';
    }>({ vertical: 'bottom', horizontal: 'right' });
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
    const [messageActionError, setMessageActionError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const isDraft = conversationKey.startsWith('draft:');

    // Resolve conversation info
    const convo = useMemo(() => {
        return inbox.find((c) => c.conversationKey === conversationKey);
    }, [conversationKey, inbox]);

    const conversationInfo = useMemo(() => {
        if (isDraft) {
            const draft = draftConversations[conversationKey];
            return {
                title: draft?.displayName || 'Cuộc trò chuyện mới',
                nickName: null as string | null,
                avatar: draft?.avatarUrl || '',
                isCommunity: false,
                targetUserId: draft?.targetUserId,
            };
        }

        const nick = convo?.nickName || null;
        const title = nick || convo?.title || (convo?.conversationType === 'Direct' ? `Cá nhân` : `Nhóm`);

        return {
            title,
            nickName: nick,
            avatar: '',
            isCommunity: convo?.conversationType === 'Community',
            targetUserId: convo?.otherUserId,
        };
    }, [conversationKey, inbox, isDraft, draftConversations, convo]);

    // Synchronize local nickname state when conversation info updates
    useEffect(() => {
        if (conversationInfo.nickName) {
            setNickname(conversationInfo.nickName);
        } else if (conversationInfo.title && !isDraft) {
            setNickname(conversationInfo.title);
        }
    }, [conversationInfo.nickName, conversationInfo.title, isDraft]);

    const chatMessages = useMemo(() => messages[conversationKey] ?? [], [conversationKey, messages]);
    const isLoading = isLoadingMessages[conversationKey] ?? false;

    // Scroll to bottom when messages or minimized state changes
    useEffect(() => {
        if (!isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isMinimized]);

    useEffect(() => {
        if (!openOptionsMessageId) return;

        const closeOptions = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest('[data-chat-message-options]')) {
                setOpenOptionsMessageId(null);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenOptionsMessageId(null);
        };

        document.addEventListener('pointerdown', closeOptions);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOptions);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [openOptionsMessageId]);

    // Tự động đóng menu tùy chọn tin nhắn khi cuộn vượt quá kích thước đường viền của khung chat
    useEffect(() => {
        if (!openOptionsMessageId) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const checkVisibilityOnScroll = () => {
            const activeOptionEl = container.querySelector(
                `[data-chat-message-options="${openOptionsMessageId}"]`,
            );
            if (!activeOptionEl) {
                setOpenOptionsMessageId(null);
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const elRect = activeOptionEl.getBoundingClientRect();

            // Nếu phần tử vượt qua viền trên hoặc viền dưới của container khung chat thì tự động tắt
            const isOutOfTop = elRect.top - 75 < containerRect.top;
            const isOutOfBottom = elRect.bottom + 75 > containerRect.bottom;

            if (isOutOfTop || isOutOfBottom) {
                setOpenOptionsMessageId(null);
            }
        };

        container.addEventListener('scroll', checkVisibilityOnScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', checkVisibilityOnScroll);
        };
    }, [openOptionsMessageId]);

    const toggleMessageOptions = (event: React.MouseEvent, messageId: string) => {
        event.stopPropagation();
        if (openOptionsMessageId === messageId) {
            setOpenOptionsMessageId(null);
            return;
        }

        const buttonEl = event.currentTarget as HTMLElement;
        const buttonRect = buttonEl.getBoundingClientRect();
        const container = messagesContainerRef.current;

        if (container) {
            const containerRect = container.getBoundingClientRect();
            const spaceAbove = buttonRect.top - containerRect.top;
            const spaceBelow = containerRect.bottom - buttonRect.bottom;
            const spaceRight = containerRect.right - buttonRect.right;

            setOptionsPlacement({
                // Nếu khoảng trống phía trên ít hơn 90px và phía dưới rộng hơn thì bung xuống dưới
                vertical: spaceAbove < 90 && spaceBelow > spaceAbove ? 'top' : 'bottom',
                // Nếu khoảng cách tới mép phải < 150px thì neo về mép phải (right-0) để menu tràn về bên trái
                horizontal: spaceRight < 150 ? 'right' : 'left',
            });
        }

        setOpenOptionsMessageId(messageId);
    };

    useEffect(() => {
        if (!isChatSettingsOpen) return;

        const closeSettings = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest('[data-chat-room-options]')) {
                setIsChatSettingsOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsChatSettingsOpen(false);
        };

        document.addEventListener('pointerdown', closeSettings);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeSettings);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isChatSettingsOpen]);

    const sendChatText = async (rawText: string, options?: { clearComposer?: boolean }) => {
        const text = rawText.trim();
        if (!text || isSending) return;

        /*
            Shared send helper:
            - Composer submit và nút cảm xúc mặc định đều dùng chung luồng gửi để tránh duplicate logic.
            - isSending chặn double-click/double-submit trong lúc request đang chạy.
            - clearComposer chỉ xóa ô nhập khi người dùng gửi nội dung đang gõ; quick reaction không cần đụng draft.
        */
        setIsSending(true);
        try {
            await sendMessage(conversationKey, text);
            if (options?.clearComposer) {
                setInputText('');
            }
        } catch (err) {
            console.error('Failed to send:', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveNickname = async () => {
        if (!conversationKey || isDraft || isSavingNickname) return;
        setIsSavingNickname(true);
        try {
            await setNickName(conversationKey, nickname, conversationInfo.targetUserId);
            setIsChatSettingsOpen(false);
        } catch (err) {
            console.error('Failed to set nickname:', err);
        } finally {
            setIsSavingNickname(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendChatText(inputText, { clearComposer: true });
    };

    const handleDefaultReactionSend = async () => {
        /*
            Quick reaction UX:
            user yêu cầu click emoji mặc định là gửi luôn, giống reaction nhanh trong chat app.
            Vì vậy button này không append emoji vào textarea nữa, mà gửi trực tiếp defaultReaction qua SignalR/API provider.
        */
        await sendChatText(defaultReaction);
    };

    const beginEditing = (message: ChatMessage) => {
        setEditingMessageId(message.messageId);
        setEditingText(message.content);
        setOpenOptionsMessageId(null);
        setMessageActionError(null);
    };

    const handleEditMessage = async (message: ChatMessage) => {
        const nextContent = editingText.trim();
        if (!nextContent || nextContent === message.content || busyMessageId) {
            if (nextContent === message.content) setEditingMessageId(null);
            return;
        }

        setBusyMessageId(message.messageId);
        setMessageActionError(null);
        try {
            await editMessage(conversationKey, message.messageId, nextContent);
            setEditingMessageId(null);
            setEditingText('');
        } catch (err) {
            console.error('Failed to edit message:', err);
            setMessageActionError('Không thể chỉnh sửa tin nhắn. Vui lòng thử lại.');
        } finally {
            setBusyMessageId(null);
        }
    };

    const handleDeleteMessage = async (message: ChatMessage) => {
        setOpenOptionsMessageId(null);
        if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

        setBusyMessageId(message.messageId);
        setMessageActionError(null);
        try {
            await deleteMessage(conversationKey, message.messageId);
        } catch (err) {
            console.error('Failed to delete message:', err);
            setMessageActionError('Không thể xóa tin nhắn. Vui lòng thử lại.');
        } finally {
            setBusyMessageId(null);
        }
    };

    return (
        <div
            className={`flex flex-col rounded-t-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl transition-all duration-300 ${
                isMinimized ? 'h-12 w-64' : 'h-[28rem] w-80'
            }`}
        >
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2 rounded-t-2xl select-none">
                <button
                    type="button"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="flex flex-1 items-center gap-2 text-left cursor-pointer min-w-0 mr-2"
                >
                    {/* Status Dot */}
                    <span className="relative flex h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {nickname.trim() || conversationInfo.title}
                    </span>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Chat settings */}
                    <div className="relative" data-chat-room-options>
                        {/*
                            Chat settings popover:
                            - data-chat-room-options là "anchor" để effect bên trên biết click nào là click bên trong menu.
                            - Khi click ra ngoài hoặc nhấn Escape thì menu đóng, tránh popover bị kẹt trên màn hình.
                            - nickname và defaultReaction chỉ là local UI state cho khung chat hiện tại; chưa persist xuống backend.
                        */}
                        <button
                            type="button"
                            aria-label="Tùy chỉnh cuộc trò chuyện"
                            aria-haspopup="menu"
                            aria-expanded={isChatSettingsOpen}
                            onClick={() => setIsChatSettingsOpen((current) => !current)}
                            className={`rounded-lg p-1 text-[var(--muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)] ${
                                isChatSettingsOpen ? 'bg-[var(--bg-hover)] text-[var(--foreground)]' : ''
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>

                        {isChatSettingsOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-8 z-30 w-64 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--foreground)] shadow-2xl"
                            >
                                <div className="space-y-2">
                                    <label className="block">
                                        <span className="mb-1 block font-bold text-[var(--muted)]">
                                            Đặt biệt danh
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={nickname}
                                                disabled={isSavingNickname}
                                                onChange={(event) => setNickname(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') {
                                                        event.preventDefault();
                                                        void handleSaveNickname();
                                                    }
                                                }}
                                                placeholder={conversationInfo.title}
                                                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                                            />
                                            <button
                                                type="button"
                                                disabled={isSavingNickname}
                                                onClick={() => void handleSaveNickname()}
                                                className="rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] transition cursor-pointer flex-shrink-0 disabled:opacity-50"
                                            >
                                                {isSavingNickname ? 'Lưu...' : 'Lưu'}
                                            </button>
                                        </div>
                                    </label>

                                    <div>
                                        <span className="mb-1.5 block font-bold text-[var(--muted)]">
                                            Cảm xúc mặc định
                                        </span>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((reaction) => (
                                                <button
                                                    key={reaction}
                                                    type="button"
                                                    onClick={() => setDefaultReaction(reaction)}
                                                    className={`flex h-8 items-center justify-center rounded-xl border text-base transition hover:bg-[var(--bg-hover)] ${
                                                        defaultReaction === reaction
                                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                                            : 'border-[var(--line)]'
                                                    }`}
                                                >
                                                    {reaction}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="rounded-xl bg-[var(--background-soft)] px-3 py-2 text-[11px] leading-4 text-[var(--muted)]">
                                        Các tuỳ chỉnh này áp dụng ngay trên khung chat hiện tại.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Minimize toggle */}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)] transition-colors"
                    >
                        {isMinimized ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path d="m18 15-6-6-6 6" />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        )}
                    </button>
                    {/* Close */}
                    <button
                        type="button"
                        onClick={() => closeChat(conversationKey)}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <>
                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 relative"
                    >
                        {messageActionError && (
                            <div className="rounded-lg bg-rose-500/10 px-2 py-1.5 text-center text-xs text-rose-500">
                                {messageActionError}
                            </div>
                        )}
                        {isLoading && chatMessages.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">
                                Đang tải tin nhắn...
                            </div>
                        ) : chatMessages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                                <span className="text-xs text-[var(--muted)]">Chưa có tin nhắn nào.</span>
                                <span className="text-[10px] text-[var(--muted)] mt-1">
                                    Gửi tin nhắn đầu tiên để bắt đầu trò chuyện.
                                </span>
                            </div>
                        ) : (
                            chatMessages.map((msg) => {
                                const isMe = currentUserId ? String(msg.senderId) === currentUserId : false;

                                return (
                                    <div
                                        key={msg.messageId}
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        {!isMe && (
                                            <span className="text-[10px] text-[var(--muted)] mb-0.5 ml-1">
                                                {msg.senderName}
                                            </span>
                                        )}
                                        <div
                                            className={`group flex min-w-0 items-center gap-1 ${
                                                isMe
                                                    ? 'w-full max-w-[92%] flex-row-reverse justify-start'
                                                    : 'max-w-[92%]'
                                            }`}
                                        >
                                            <div
                                                className={`relative min-w-0 rounded-2xl px-3 py-2 text-sm leading-5 shadow-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                                                    isMe
                                                        ? 'max-w-[calc(100%-2.25rem)] bg-[var(--accent)] text-white rounded-tr-none'
                                                        : 'max-w-full bg-[var(--background-soft)] text-[var(--foreground)] rounded-tl-none border border-[var(--line)]'
                                                } ${msg.isDeleted ? 'italic opacity-70' : ''}`}
                                                title={formatChatMessageTime(msg.sentAtUtc)}
                                            >
                                                {editingMessageId === msg.messageId ? (
                                                    <div className="min-w-48 space-y-2">
                                                        <textarea
                                                            autoFocus
                                                            rows={2}
                                                            value={editingText}
                                                            disabled={busyMessageId === msg.messageId}
                                                            onChange={(event) => setEditingText(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Escape') {
                                                                    setEditingMessageId(null);
                                                                    setEditingText('');
                                                                }
                                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                                    event.preventDefault();
                                                                    void handleEditMessage(msg);
                                                                }
                                                            }}
                                                            className="w-full resize-none rounded-lg border border-white/40 bg-white px-2 py-1 text-sm text-slate-900 outline-none break-words [overflow-wrap:anywhere] focus:border-white"
                                                        />
                                                        <div className="flex justify-end gap-1.5 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingMessageId(null);
                                                                    setEditingText('');
                                                                }}
                                                                className="rounded-md px-2 py-1 hover:bg-white/15"
                                                            >
                                                                Hủy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    !editingText.trim() ||
                                                                    busyMessageId === msg.messageId
                                                                }
                                                                onClick={() => void handleEditMessage(msg)}
                                                                className="rounded-md bg-white px-2 py-1 font-medium text-[var(--accent)] disabled:opacity-50"
                                                            >
                                                                Lưu
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="block min-w-0 break-words [overflow-wrap:anywhere]">
                                                            {msg.isDeleted ? 'Tin nhắn đã bị xóa' : msg.content}
                                                        </span>
                                                        {msg.isEdited && !msg.isDeleted && (
                                                            <span className="ml-1 text-[10px] opacity-70">
                                                                (đã chỉnh sửa)
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {isMe && !msg.isDeleted && editingMessageId !== msg.messageId && (
                                                <div
                                                    className="relative flex h-8 w-8 shrink-0 items-center justify-center"
                                                    data-chat-message-options={msg.messageId}
                                                >
                                                    {/*
                                                        Layout guard cho message actions:
                                                        - Row của tin nhắn của mình luôn rộng tối đa 92% khung chat.
                                                        - Bubble bị giới hạn còn calc(100% - 2.25rem) để chừa lane 32px cho nút 3 chấm.
                                                        - Nhờ vậy text dài vẫn wrap trong bubble, còn nút sửa/xóa không bị đẩy ra ngoài UI.
                                                    */}
                                                    <button
                                                        type="button"
                                                        aria-label="Tùy chọn tin nhắn"
                                                        aria-haspopup="menu"
                                                        aria-expanded={openOptionsMessageId === msg.messageId}
                                                        disabled={busyMessageId === msg.messageId}
                                                        onClick={(event) => toggleMessageOptions(event, msg.messageId)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40 cursor-pointer ${
                                                            openOptionsMessageId === msg.messageId
                                                                ? 'bg-[var(--bg-hover)] opacity-100'
                                                                : 'opacity-0 group-hover:opacity-100'
                                                        }`}
                                                    >
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            aria-hidden="true"
                                                        >
                                                            <circle cx="5" cy="12" r="2" />
                                                            <circle cx="12" cy="12" r="2" />
                                                            <circle cx="19" cy="12" r="2" />
                                                        </svg>
                                                    </button>

                                                    {openOptionsMessageId === msg.messageId && (
                                                        <div
                                                            role="menu"
                                                            className={`absolute z-20 w-36 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1 text-xs text-[var(--foreground)] shadow-xl animate-fade-in ${
                                                                optionsPlacement.vertical === 'top' ? 'top-8' : 'bottom-8'
                                                            } ${
                                                                optionsPlacement.horizontal === 'right' ? 'right-0' : 'left-0'
                                                            }`}
                                                        >
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={() => beginEditing(msg)}
                                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--bg-hover)] cursor-pointer"
                                                            >
                                                                Chỉnh sửa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={() => void handleDeleteMessage(msg)}
                                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                                            >
                                                                Xóa
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Composer */}
                    <form
                        onSubmit={handleSend}
                        className="border-t border-[var(--line)] p-2 bg-[var(--surface)] flex items-center gap-1.5 rounded-b-2xl"
                    >
                        <textarea
                            rows={1}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            disabled={isSending}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    event.currentTarget.form?.requestSubmit();
                                }
                            }}
                            className="max-h-20 min-h-8 flex-1 resize-none rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] break-words [overflow-wrap:anywhere] focus:border-[rgba(204,95,61,0.35)] transition-all"
                        />
                        <button
                            type="button"
                            title={`Cảm xúc mặc định: ${defaultReaction}`}
                            disabled={isSending}
                            onClick={() => void handleDefaultReactionSend()}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-sm transition hover:bg-[var(--bg-hover)] disabled:opacity-40"
                        >
                            {defaultReaction}
                        </button>
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isSending}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:bg-gray-400 transition-all cursor-pointer"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
