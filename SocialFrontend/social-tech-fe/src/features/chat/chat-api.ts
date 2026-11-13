import { httpClient } from '@/shared/api/http-client';
import type {
    ChatInboxResponse,
    ChatMessagesResponse,
    ChatSendResponse,
    SendCommunityMessageRequest,
    SendDirectMessageRequest,
    ChatCandidatesResponse,
    EditChatMessageRequest,
    RequestSetNickName,
} from '@/features/chat/contracts';
import type { ApiResponse } from '@/common/types/api';

export const chatApi = {
    getInbox() {
        return httpClient.get<ChatInboxResponse>('/api/Chat/inbox', {
            showGlobalLoading: false,
        });
    },
    setNickName(payload: RequestSetNickName) {
        return httpClient.post<ApiResponse<string>>('/api/Chat/nickname', payload, {
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
            showGlobalLoading: false,
        });
    },
    sendDirectMessage(payload: SendDirectMessageRequest) {
        return httpClient.post<ChatSendResponse>('/api/Chat/direct/send', payload, {
            showGlobalLoading: false,
        });
    },
    sendCommunityMessage(payload: SendCommunityMessageRequest) {
        return httpClient.post<ChatSendResponse>('/api/Chat/community/send', payload, {
            showGlobalLoading: false,
        });
    },
    searchCandidates(query: string) {
        const qs = query ? `?query=${encodeURIComponent(query)}` : '';
        return httpClient.get<ChatCandidatesResponse>(`/api/Chat/candidates${qs}`, {
            showGlobalLoading: false,
        });
    },
    editMessage(payload: EditChatMessageRequest) {
        return httpClient.put<void>('/api/Chat/message/edit', payload, {
            showGlobalLoading: false,
        });
    },
    deleteMessage(messageId: string) {
        return httpClient.delete<void>(`/api/Chat/message/delete/${encodeURIComponent(messageId)}`, {
            showGlobalLoading: false,
        });
    },
};
