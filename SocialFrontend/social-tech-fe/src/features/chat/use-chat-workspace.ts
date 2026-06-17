'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { createChatHubConnection } from '@/shared/api/realtime-client';
import { useAuth } from '@/providers/auth-provider';
import { chatApi } from '@/features/chat/chat-api';
import type {
    ChatConversationSummary,
    ChatMessage,
    ChatSendResult,
    SendCommunityMessageRequest,
    SendDirectMessageRequest,
} from '@/features/chat/contracts';

type DraftMode = 'direct' | 'community';

function sortInbox(items: ChatConversationSummary[]) {
    return [...items].sort((left, right) => {
        const leftTime = left.lastMessageAtUtc ? new Date(left.lastMessageAtUtc).getTime() : 0;
        const rightTime = right.lastMessageAtUtc ? new Date(right.lastMessageAtUtc).getTime() : 0;
        return rightTime - leftTime;
    });
}

function upsertConversation(items: ChatConversationSummary[], nextItem: ChatConversationSummary) {
    const nextItems = [nextItem, ...items.filter((item) => item.conversationKey !== nextItem.conversationKey)];
    return sortInbox(nextItems);
}

function appendUniqueMessage(items: ChatMessage[], nextItem: ChatMessage) {
    const nextItems = [...items.filter((item) => item.messageId !== nextItem.messageId), nextItem];
    return nextItems.sort((left, right) => new Date(left.sentAtUtc).getTime() - new Date(right.sentAtUtc).getTime());
}

function buildFallbackConversation(result: ChatSendResult, mode: DraftMode, directUserId: string, communityId: string) {
    return {
        conversationKey: result.conversationKey,
        conversationType: mode === 'direct' ? 'Direct' : 'Community',
        otherUserId: mode === 'direct' ? Number(directUserId) : null,
        communityId: mode === 'community' ? Number(communityId) : null,
        title: mode === 'community' ? `Community ${communityId}` : `Direct ${directUserId}`,
        lastMessagePreview: result.message.content,
        lastMessageAtUtc: result.message.sentAtUtc,
    } satisfies ChatConversationSummary;
}

export function useChatWorkspace() {
    const { accessToken, isHydrated } = useAuth();
    const connectionRef = useRef<HubConnection | null>(null);
    const [inbox, setInbox] = useState<ChatConversationSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
    const [draftMode, setDraftMode] = useState<DraftMode>('direct');
    const [directUserId, setDirectUserId] = useState('');
    const [communityId, setCommunityId] = useState('');
    const [messageText, setMessageText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoadingInbox, setIsLoadingInbox] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const selectedConversation = useMemo(
        () => inbox.find((item) => item.conversationKey === selectedConversationKey) ?? null,
        [inbox, selectedConversationKey],
    );

    useEffect(() => {
        if (!isHydrated || !accessToken) {
            return;
        }

        const connection = createChatHubConnection();
        connectionRef.current = connection;
        let isDisposed = false;
        let hasStarted = false;

        const handleMessageCreated = (payload: ChatMessage) => {
            if (payload.conversationKey === selectedConversationKey) {
                setMessages((current) => appendUniqueMessage(current, payload));
            }
        };

        const handleConversationUpdated = (payload: ChatConversationSummary) => {
            setInbox((current) => upsertConversation(current, payload));
        };

        connection.on('chat.message.created', handleMessageCreated);
        connection.on('chat.conversation.updated', handleConversationUpdated);

        async function startConnection() {
            try {
                await connection.start();
                hasStarted = true;
                if (isDisposed) {
                    return;
                }

                setIsConnected(true);
                const nextInbox = (await connection.invoke('GetInbox')) as ChatConversationSummary[];
                if (!isDisposed) {
                    setInbox(sortInbox(nextInbox));
                }
            } catch (cause) {
                if (!isDisposed) {
                    setError(cause instanceof Error ? cause.message : 'Khong the ket noi chat realtime.');
                }
            }
        }

        void startConnection();

        return () => {
            isDisposed = true;
            setIsConnected(false);
            connection.off('chat.message.created', handleMessageCreated);
            connection.off('chat.conversation.updated', handleConversationUpdated);
            if (connectionRef.current === connection) {
                connectionRef.current = null;
            }

            if (!hasStarted) {
                return;
            }

            void connection.stop();
        };
    }, [accessToken, isHydrated, selectedConversationKey]);

    useEffect(() => {
        if (!isHydrated || !accessToken) {
            return;
        }

        let isDisposed = false;

        async function loadInbox() {
            setIsLoadingInbox(true);

            try {
                const response = await chatApi.getInbox();
                if (isDisposed || !response.data) {
                    return;
                }

                setInbox(sortInbox(response.data));
            } catch (cause) {
                if (!isDisposed) {
                    setError(cause instanceof Error ? cause.message : 'Khong the tai inbox chat.');
                }
            } finally {
                if (!isDisposed) {
                    setIsLoadingInbox(false);
                }
            }
        }

        void loadInbox();

        return () => {
            isDisposed = true;
        };
    }, [accessToken, isHydrated]);

    useEffect(() => {
        if (!selectedConversationKey || !isHydrated || !accessToken) {
            return;
        }

        let isDisposed = false;
        const connection = connectionRef.current;

        async function loadMessages() {
            setIsLoadingMessages(true);
            setError(null);

            try {
                if (connection && connection.state === 'Connected') {
                    await connection.invoke('JoinConversation', selectedConversationKey);
                    const nextMessages = (await connection.invoke(
                        'GetMessages',
                        selectedConversationKey,
                        50,
                        null,
                    )) as ChatMessage[];

                    if (!isDisposed) {
                        setMessages(nextMessages);
                    }

                    return;
                }

                const response = await chatApi.getMessages(selectedConversationKey, 50);
                if (!isDisposed) {
                    setMessages(response.data ?? []);
                }
            } catch (cause) {
                if (!isDisposed) {
                    setError(cause instanceof Error ? cause.message : 'Khong the tai lich su tin nhan.');
                }
            } finally {
                if (!isDisposed) {
                    setIsLoadingMessages(false);
                }
            }
        }

        void loadMessages();

        return () => {
            isDisposed = true;
            if (connection && connection.state === 'Connected') {
                void connection.invoke('LeaveConversation', selectedConversationKey).catch(() => undefined);
            }
        };
    }, [accessToken, isHydrated, selectedConversationKey]);

    async function refreshInbox() {
        setIsLoadingInbox(true);
        setError(null);

        try {
            const connection = connectionRef.current;
            if (connection && connection.state === 'Connected') {
                const nextInbox = (await connection.invoke('GetInbox')) as ChatConversationSummary[];
                setInbox(sortInbox(nextInbox));
                return;
            }

            const response = await chatApi.getInbox();
            setInbox(sortInbox(response.data ?? []));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Khong the lam moi inbox chat.');
        } finally {
            setIsLoadingInbox(false);
        }
    }

    function startNewConversation(mode: DraftMode) {
        setDraftMode(mode);
        setSelectedConversationKey(null);
        setMessages([]);
        setStatus(null);
        setError(null);
    }

    async function sendMessage() {
        const trimmedMessage = messageText.trim();
        if (!trimmedMessage) {
            setError('Noi dung tin nhan khong duoc de trong.');
            return;
        }

        setIsSending(true);
        setError(null);
        setStatus(null);

        const activeMode = selectedConversation?.conversationType === 'Community' ? 'community' : draftMode;
        const resolvedDirectUserId = selectedConversation?.otherUserId
            ? String(selectedConversation.otherUserId)
            : directUserId.trim();
        const resolvedCommunityId = selectedConversation?.communityId
            ? String(selectedConversation.communityId)
            : communityId.trim();
        const connection = connectionRef.current;

        try {
            let result: ChatSendResult;

            if ((selectedConversation?.conversationType === 'Direct' || activeMode === 'direct') && resolvedDirectUserId) {
                const payload: SendDirectMessageRequest = {
                    targetUserId: Number(resolvedDirectUserId),
                    content: trimmedMessage,
                    clientMessageId: crypto.randomUUID(),
                };

                if (connection && connection.state === 'Connected') {
                    result = (await connection.invoke('SendDirectMessage', payload)) as ChatSendResult;
                } else {
                    const response = await chatApi.sendDirectMessage(payload);
                    result = response.data as ChatSendResult;
                }
            } else {
                if (!resolvedCommunityId) {
                    throw new Error('Hay nhap community id de gui group chat.');
                }

                const payload: SendCommunityMessageRequest = {
                    communityId: Number(resolvedCommunityId),
                    content: trimmedMessage,
                    clientMessageId: crypto.randomUUID(),
                };

                if (connection && connection.state === 'Connected') {
                    result = (await connection.invoke('SendCommunityMessage', payload)) as ChatSendResult;
                } else {
                    const response = await chatApi.sendCommunityMessage(payload);
                    result = response.data as ChatSendResult;
                }
            }

            setSelectedConversationKey(result.conversationKey);
            setMessages((current) => appendUniqueMessage(current, result.message));
            setInbox((current) => {
                const existing = current.find((item) => item.conversationKey === result.conversationKey);
                const nextConversation = existing
                    ? {
                          ...existing,
                          lastMessagePreview: result.message.content,
                          lastMessageAtUtc: result.message.sentAtUtc,
                      }
                    : buildFallbackConversation(result, activeMode, resolvedDirectUserId, resolvedCommunityId);

                return upsertConversation(current, nextConversation);
            });
            setMessageText('');
            setStatus(result.conversationCreated ? 'Da tao conversation moi tu tin nhan dau tien.' : 'Da gui tin nhan.');

            if (connection && connection.state === 'Connected') {
                await connection.invoke('JoinConversation', result.conversationKey);
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Khong the gui tin nhan luc nay.');
        } finally {
            setIsSending(false);
        }
    }

    return {
        communityId,
        directUserId,
        draftMode,
        error,
        inbox,
        isConnected,
        isLoadingInbox,
        isLoadingMessages,
        isSending,
        messageText,
        messages,
        refreshInbox,
        selectedConversation,
        selectedConversationKey,
        sendMessage,
        setCommunityId,
        setDirectUserId,
        setDraftMode,
        setMessageText,
        setSelectedConversationKey,
        startNewConversation,
        status,
    };
}
