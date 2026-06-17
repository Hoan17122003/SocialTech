import { httpClient } from '@/shared/api/http-client';
import type {
    ChatInboxResponse,
    ChatMessagesResponse,
    ChatSendResponse,
    SendCommunityMessageRequest,
    SendDirectMessageRequest,
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
};
