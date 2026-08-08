'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { createChatHubConnection } from '@/shared/api/realtime-client';
import { useAuth } from '@/providers/auth-provider';
import { getDateTimestamp } from '@/common/utils/format-date';
import { chatApi } from '@/features/chat/chat-api';
import type {
    ChatConversationSummary,
    ChatMessage,
    ChatSendResult,
    SendCommunityMessageRequest,
    SendDirectMessageRequest,
    DetailUserFollow,
} from '@/features/chat/contracts';

type DraftConversationInfo = {
    targetUserId: number;
    displayName: string;
    avatarUrl: string;
};

type ChatContextType = {
    isConnected: boolean;
    inbox: ChatConversationSummary[];
    isLoadingInbox: boolean;
    messages: Record<string, ChatMessage[]>;
    isLoadingMessages: Record<string, boolean>;
    openChatBoxes: string[];
    draftConversations: Record<string, DraftConversationInfo>;
    activeChatBoxKey: string | null;
    openChat: (conversationKey: string) => Promise<void>;
    openDirectChatWithUser: (targetUserId: number, displayName: string, avatarUrl: string) => Promise<void>;
    closeChat: (conversationKey: string) => void;
    sendMessage: (key: string, content: string) => Promise<void>;
    loadMessages: (conversationKey: string) => Promise<void>;
    refreshInbox: () => Promise<void>;
    searchCandidates: (query: string) => Promise<DetailUserFollow[]>;
    editMessage: (conversationKey: string, messageId: string, newContent: string) => Promise<void>;
    deleteMessage: (conversationKey: string, messageId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function sortInbox(items: ChatConversationSummary[]) {
    return [...items].sort((left, right) => {
        const leftTime = getDateTimestamp(left.lastMessageAtUtc);
        const rightTime = getDateTimestamp(right.lastMessageAtUtc);
        return rightTime - leftTime;
    });
}

function upsertConversation(items: ChatConversationSummary[], nextItem: ChatConversationSummary) {
    const nextItems = [nextItem, ...items.filter((item) => item.conversationKey !== nextItem.conversationKey)];
    return sortInbox(nextItems);
}

function appendUniqueMessage(items: ChatMessage[], nextItem: ChatMessage) {
    const nextItems = [...items.filter((item) => item.messageId !== nextItem.messageId), nextItem];
    return nextItems.sort((left, right) => getDateTimestamp(left.sentAtUtc) - getDateTimestamp(right.sentAtUtc));
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const { accessToken, isHydrated } = useAuth();
    const connectionRef = useRef<HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [inbox, setInbox] = useState<ChatConversationSummary[]>([]);
    const [isLoadingInbox, setIsLoadingInbox] = useState(false);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [isLoadingMessages, setIsLoadingMessages] = useState<Record<string, boolean>>({});
    const [openChatBoxes, setOpenChatBoxes] = useState<string[]>([]);
    const [draftConversations, setDraftConversations] = useState<Record<string, DraftConversationInfo>>({});
    const [activeChatBoxKey, setActiveChatBoxKey] = useState<string | null>(null);

    // 1. Tự động thiết lập kết nối SignalR Hub khi người dùng đã đăng nhập (accessToken khả dụng)
    useEffect(() => {
        if (!isHydrated || !accessToken) {
            connectionRef.current = null;
            return;
        }

        // Tạo đối tượng kết nối SignalR đến /chatHub
        const connection = createChatHubConnection();
        connectionRef.current = connection;
        let isDisposed = false;
        let hasStarted = false;

        // Xử lý sự kiện nhận tin nhắn mới từ bất kỳ cuộc hội thoại nào đang tham gia
        const handleMessageCreated = (payload: ChatMessage) => {
            setMessages((current) => {
                const currentMsgs = current[payload.conversationKey] ?? [];
                return {
                    ...current,
                    [payload.conversationKey]: appendUniqueMessage(currentMsgs, payload),
                };
            });
        };

        // Xử lý sự kiện cuộc hội thoại được cập nhật (ví dụ: có tin nhắn mới thì đẩy hội thoại lên đầu inbox)
        const handleConversationUpdated = (payload: ChatConversationSummary) => {
            setInbox((current) => upsertConversation(current, payload));
        };

        // Đăng ký các bộ lắng nghe sự kiện từ Server phát xuống
        connection.on('chat.message.created', handleMessageCreated);
        connection.on('chat.conversation.updated', handleConversationUpdated);

        // Hàm bắt đầu kết nối SignalR
        async function startConnection() {
            try {
                await connection.start();
                hasStarted = true;
                if (!isDisposed) {
                    setIsConnected(true);
                }
            } catch (err) {
                console.error('SignalR Chat connection failed:', err);
                if (!isDisposed) {
                    setIsConnected(false);
                }
            }
        }

        void startConnection();

        // Cleanup: ngắt kết nối và giải phóng tài nguyên khi component unmount hoặc token thay đổi
        return () => {
            isDisposed = true;
            setIsConnected(false);
            connection.off('chat.message.created', handleMessageCreated);
            connection.off('chat.conversation.updated', handleConversationUpdated);
            if (connectionRef.current === connection) {
                connectionRef.current = null;
            }

            if (hasStarted) {
                void connection.stop();
            }
        };
    }, [accessToken, isHydrated]);

    // Load inbox on mount or when token changes
    useEffect(() => {
        if (!isHydrated || !accessToken) {
            return;
        }

        let isDisposed = false;

        async function loadInbox() {
            setIsLoadingInbox(true);
            try {
                const response = await chatApi.getInbox();
                if (!isDisposed && response.data) {
                    setInbox(sortInbox(response.data));
                }
            } catch (err) {
                console.error('Failed to load chat inbox:', err);
            } finally {
                if (!isDisposed) {
                    setIsLoadingInbox(false);
                }
            }
        }

        void loadInbox();

        return () => {
            isDisposed = true;
            setInbox([]);
        };
    }, [accessToken, isHydrated]);

    const refreshInbox = useCallback(async () => {
        setIsLoadingInbox(true);
        try {
            const response = await chatApi.getInbox();
            if (response.data) {
                setInbox(sortInbox(response.data));
            }
        } catch (err) {
            console.error('Failed to refresh inbox:', err);
        } finally {
            setIsLoadingInbox(false);
        }
    }, []);

    const loadMessages = useCallback(async (conversationKey: string) => {
        if (isLoadingMessages[conversationKey]) return;

        setIsLoadingMessages((curr) => ({ ...curr, [conversationKey]: true }));
        try {
            const connection = connectionRef.current;
            if (connection && isConnected && connection.state === 'Connected') {
                await connection.invoke('JoinConversation', conversationKey);
                const nextMessages = (await connection.invoke(
                    'GetMessages',
                    conversationKey,
                    50,
                    null,
                )) as ChatMessage[];

                setMessages((curr) => ({
                    ...curr,
                    [conversationKey]: nextMessages.sort(
                        (a, b) => getDateTimestamp(a.sentAtUtc) - getDateTimestamp(b.sentAtUtc),
                    ),
                }));
                return;
            }

            const response = await chatApi.getMessages(conversationKey, 50);
            const msgData = response.data;
            if (msgData) {
                setMessages((curr) => ({
                    ...curr,
                    [conversationKey]: [...msgData].sort(
                        (a, b) => getDateTimestamp(a.sentAtUtc) - getDateTimestamp(b.sentAtUtc),
                    ),
                }));
            }
        } catch (err) {
            console.error(`Failed to load messages for ${conversationKey}:`, err);
        } finally {
            setIsLoadingMessages((curr) => ({ ...curr, [conversationKey]: false }));
        }
    }, [isConnected, isLoadingMessages]);

    const openChat = useCallback(async (conversationKey: string) => {
        setOpenChatBoxes((prev) => {
            if (prev.includes(conversationKey)) return prev;
            // Limit to max 3 floating chatboxes
            const next = [...prev, conversationKey];
            if (next.length > 3) {
                // Remove the oldest chatbox
                return next.slice(next.length - 3);
            }
            return next;
        });
        setActiveChatBoxKey(conversationKey);

        // Load history messages if not already loaded
        if (!messages[conversationKey]) {
            await loadMessages(conversationKey);
        }
    }, [loadMessages, messages]);

    const openDirectChatWithUser = useCallback(async (targetUserId: number, displayName: string, avatarUrl: string) => {
        // Check if there is already an existing direct conversation with this user
        const existing = inbox.find((c) => c.conversationType === 'Direct' && c.otherUserId === targetUserId);

        if (existing) {
            await openChat(existing.conversationKey);
            return;
        }

        // Otherwise open a draft chat box
        const draftKey = `draft:user:${targetUserId}`;
        setDraftConversations((prev) => ({
            ...prev,
            [draftKey]: { targetUserId, displayName, avatarUrl },
        }));

        setOpenChatBoxes((prev) => {
            if (prev.includes(draftKey)) return prev;
            const next = [...prev, draftKey];
            if (next.length > 3) {
                return next.slice(next.length - 3);
            }
            return next;
        });
        setActiveChatBoxKey(draftKey);
        setMessages((curr) => ({ ...curr, [draftKey]: [] }));
    }, [inbox, openChat]);

    const closeChat = useCallback((conversationKey: string) => {
        setOpenChatBoxes((prev) => prev.filter((k) => k !== conversationKey));
        if (activeChatBoxKey === conversationKey) {
            setActiveChatBoxKey(null);
        }

        const connection = connectionRef.current;
        if (connection && isConnected && connection.state === 'Connected' && !conversationKey.startsWith('draft:')) {
            void connection.invoke('LeaveConversation', conversationKey).catch(() => undefined);
        }
    }, [activeChatBoxKey, isConnected]);

    // 2. Gửi tin nhắn đi. Hỗ trợ gửi qua kênh SignalR trực tiếp hoặc fallback qua REST API nếu kết nối mất
    const sendMessage = useCallback(async (key: string, content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const connection = connectionRef.current;
        const isDraft = key.startsWith('draft:');

        try {
            if (isDraft) {
                // Xử lý gửi tin nhắn đầu tiên cho cuộc hội thoại nháp (chưa tồn tại dưới DB)
                const draftInfo = draftConversations[key];
                if (!draftInfo) return;

                const payload: SendDirectMessageRequest = {
                    targetUserId: draftInfo.targetUserId,
                    content: trimmed,
                    clientMessageId: crypto.randomUUID(), // Tạo GUID định danh tin nhắn phía Client để phòng tránh trùng lặp
                };

                let result: ChatSendResult;
                // Nếu đang kết nối SignalR, gọi qua Invoke; ngược lại fallback gọi REST API
                if (connection && isConnected && connection.state === 'Connected') {
                    result = (await connection.invoke('SendDirectMessage', payload)) as ChatSendResult;
                } else {
                    const response = await chatApi.sendDirectMessage(payload);
                    result = response.data as ChatSendResult;
                }

                // Tráo đổi khóa nháp (draft key) thành khóa cuộc hội thoại thực tế (real key) vừa được tạo từ DB
                const realKey = result.conversationKey;

                setOpenChatBoxes((prev) => prev.map((k) => (k === key ? realKey : k)));
                if (activeChatBoxKey === key) {
                    setActiveChatBoxKey(realKey);
                }

                setMessages((curr) => {
                    const next = { ...curr };
                    delete next[key];
                    next[realKey] = [result.message];
                    return next;
                });

                // Xóa thông tin nháp
                setDraftConversations((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });

                // Cập nhật danh sách hội thoại gần đây (inbox)
                const newConversation: ChatConversationSummary = {
                    conversationKey: realKey,
                    conversationType: 'Direct',
                    otherUserId: draftInfo.targetUserId,
                    title: draftInfo.displayName,
                    lastMessagePreview: trimmed,
                    lastMessageAtUtc: result.message.sentAtUtc,
                };
                setInbox((current) => upsertConversation(current, newConversation));

                // Thực hiện join phòng chat thời gian thực nếu SignalR đang hoạt động
                if (connection && isConnected && connection.state === 'Connected') {
                    await connection.invoke('JoinConversation', realKey);
                }
            } else {
                // Xử lý gửi tin nhắn cho cuộc hội thoại đã tồn tại
                const isCommunity = inbox.find((c) => c.conversationKey === key)?.conversationType === 'Community';

                if (isCommunity) {
                    // Hội thoại nhóm
                    const communityId = inbox.find((c) => c.conversationKey === key)?.communityId;
                    if (!communityId) return;

                    const payload: SendCommunityMessageRequest = {
                        communityId,
                        content: trimmed,
                        clientMessageId: crypto.randomUUID(),
                    };

                    let result: ChatSendResult;
                    if (connection && isConnected && connection.state === 'Connected') {
                        result = (await connection.invoke('SendCommunityMessage', payload)) as ChatSendResult;
                    } else {
                        const response = await chatApi.sendCommunityMessage(payload);
                        result = response.data as ChatSendResult;
                    }

                    setMessages((curr) => ({
                        ...curr,
                        [key]: appendUniqueMessage(curr[key] ?? [], result.message),
                    }));
                } else {
                    // Hội thoại trực tiếp (1-1)
                    const otherUserId = inbox.find((c) => c.conversationKey === key)?.otherUserId;
                    if (!otherUserId) return;

                    const payload: SendDirectMessageRequest = {
                        targetUserId: otherUserId,
                        content: trimmed,
                        clientMessageId: crypto.randomUUID(),
                    };

                    let result: ChatSendResult;
                    if (connection && isConnected && connection.state === 'Connected') {
                        result = (await connection.invoke('SendDirectMessage', payload)) as ChatSendResult;
                    } else {
                        const response = await chatApi.sendDirectMessage(payload);
                        result = response.data as ChatSendResult;
                    }

                    setMessages((curr) => ({
                        ...curr,
                        [key]: appendUniqueMessage(curr[key] ?? [], result.message),
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            throw err;
        }
    }, [activeChatBoxKey, draftConversations, inbox, isConnected]);

    const editMessage = useCallback(async (conversationKey: string, messageId: string, newContent: string) => {
        const trimmed = newContent.trim();
        if (!trimmed) return;

        await chatApi.editMessage({ conversationKey, messageId, newContent: trimmed });
        setMessages((current) => ({
            ...current,
            [conversationKey]: (current[conversationKey] ?? []).map((message) =>
                message.messageId === messageId ? { ...message, content: trimmed, isEdited: true } : message,
            ),
        }));
    }, []);

    const deleteMessage = useCallback(async (conversationKey: string, messageId: string) => {
        await chatApi.deleteMessage(messageId);
        setMessages((current) => ({
            ...current,
            [conversationKey]: (current[conversationKey] ?? []).map((message) =>
                message.messageId === messageId ? { ...message, content: '', isDeleted: true } : message,
            ),
        }));
    }, []);

    const searchCandidates = useCallback(async (query: string): Promise<DetailUserFollow[]> => {
        try {
            const response = await chatApi.searchCandidates(query);
            return response.data ?? [];
        } catch (err) {
            console.error('Failed to search candidates:', err);
            return [];
        }
    }, []);

    const contextValue = useMemo(
        () => ({
            isConnected,
            inbox,
            isLoadingInbox,
            messages,
            isLoadingMessages,
            openChatBoxes,
            draftConversations,
            activeChatBoxKey,
            openChat,
            openDirectChatWithUser,
            closeChat,
            sendMessage,
            loadMessages,
            refreshInbox,
            searchCandidates,
            editMessage,
            deleteMessage,
        }),
        [
            isConnected,
            inbox,
            isLoadingInbox,
            messages,
            isLoadingMessages,
            openChatBoxes,
            draftConversations,
            activeChatBoxKey,
            openChat,
            openDirectChatWithUser,
            closeChat,
            sendMessage,
            loadMessages,
            refreshInbox,
            searchCandidates,
            editMessage,
            deleteMessage,
        ],
    );

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
