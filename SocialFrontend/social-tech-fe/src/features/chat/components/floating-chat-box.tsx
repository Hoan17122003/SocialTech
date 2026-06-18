'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/providers/chat-provider';
import { useAuth } from '@/providers/auth-provider';
import type { ChatMessage } from '@/features/chat/contracts';

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

function formatChatTime(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
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
        closeChat,
    } = useChat();

    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isDraft = conversationKey.startsWith('draft:');

    // Resolve conversation info
    const conversationInfo = useMemo(() => {
        if (isDraft) {
            const draft = draftConversations[conversationKey];
            return {
                title: draft?.displayName || 'Cuộc trò chuyện mới',
                avatar: draft?.avatarUrl || '',
                isCommunity: false,
            };
        }

        const convo = inbox.find((c) => c.conversationKey === conversationKey);
        return {
            title: convo?.title || (convo?.conversationType === 'Direct' ? `Cá nhân` : `Nhóm`),
            avatar: '',
            isCommunity: convo?.conversationType === 'Community',
        };
    }, [conversationKey, inbox, isDraft, draftConversations]);

    const chatMessages = messages[conversationKey] ?? [];
    const isLoading = isLoadingMessages[conversationKey] ?? false;

    // Scroll to bottom when messages or minimized state changes
    useEffect(() => {
        if (!isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isMinimized]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputText.trim();
        if (!text || isSending) return;

        setIsSending(true);
        try {
            await sendMessage(conversationKey, text);
            setInputText('');
        } catch (err) {
            console.error('Failed to send:', err);
        } finally {
            setIsSending(false);
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
                        {conversationInfo.title}
                    </span>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Minimize toggle */}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)] transition-colors"
                    >
                        {isMinimized ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                        )}
                    </button>
                    {/* Close */}
                    <button
                        type="button"
                        onClick={() => closeChat(conversationKey)}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {isLoading && chatMessages.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">
                                Đang tải tin nhắn...
                            </div>
                        ) : chatMessages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                                <span className="text-xs text-[var(--muted)]">Chưa có tin nhắn nào.</span>
                                <span className="text-[10px] text-[var(--muted)] mt-1">Gửi tin nhắn đầu tiên để bắt đầu trò chuyện.</span>
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
                                            className={`group relative max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 shadow-sm whitespace-pre-wrap ${
                                                isMe
                                                    ? 'bg-[var(--accent)] text-white rounded-tr-none'
                                                    : 'bg-[var(--background-soft)] text-[var(--foreground)] rounded-tl-none border border-[var(--line)]'
                                            }`}
                                            title={formatChatTime(msg.sentAtUtc)}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Composer */}
                    <form onSubmit={handleSend} className="border-t border-[var(--line)] p-2 bg-[var(--surface)] flex items-center gap-1.5 rounded-b-2xl">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            disabled={isSending}
                            className="flex-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[rgba(204,95,61,0.35)] transition-all"
                        />
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
