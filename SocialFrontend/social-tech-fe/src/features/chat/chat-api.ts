import { httpClient } from '@/shared/api/http-client';
import type {
    ChatInboxResponse,
    ChatMessagesResponse,
    ChatSendResponse,
    SendCommunityMessageRequest,
    SendDirectMessageRequest,
    ChatCandidatesResponse,
    EditChatMessageRequest,
} from '@/features/chat/contracts';

export const chatApi = {
    getInbox() {
        return httpClient.get<ChatInboxResponse>('/api/Chat/inbox', {
            auth: true,
            showGlobalLoading: false,
        });
    },
    getMessages(conversationKey: string, take = 50, beforeUtc?: string | null) {
        const params = new URLSearchParams({
            conversationKey,
            take: String(take),
        });

        if (beforeUtc) {
            params.set('beforeUtc', beforeUtc);
        }

        return httpClient.get<ChatMessagesResponse>(`/api/Chat/messages?${params.toString()}`, {
            auth: true,
            showGlobalLoading: false,
        });
    },
    sendDirectMessage(payload: SendDirectMessageRequest) {
        return httpClient.post<ChatSendResponse>('/api/Chat/direct/send', payload, {
            auth: true,
            showGlobalLoading: false,
        });
    },
    sendCommunityMessage(payload: SendCommunityMessageRequest) {
        return httpClient.post<ChatSendResponse>('/api/Chat/community/send', payload, {
            auth: true,
            showGlobalLoading: false,
        });
    },
    searchCandidates(query: string) {
        const qs = query ? `?query=${encodeURIComponent(query)}` : '';
        return httpClient.get<ChatCandidatesResponse>(`/api/Chat/candidates${qs}`, {
            auth: true,
            showGlobalLoading: false,
        });
    },
    editMessage(payload: EditChatMessageRequest) {
        return httpClient.put<void>('/api/Chat/message/edit', payload, {
            auth: true,
            showGlobalLoading: false,
        });
    },
    deleteMessage(messageId: string) {
        return httpClient.delete<void>(`/api/Chat/message/delete/${encodeURIComponent(messageId)}`, {
            auth: true,
            showGlobalLoading: false,
        });
    },
};
