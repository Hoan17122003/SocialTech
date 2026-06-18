import type { ApiResponse } from '@/common/types/api';

export type ChatConversationType = 'Direct' | 'Community';

export type ChatConversationSummary = {
    conversationKey: string;
    conversationType: ChatConversationType;
    otherUserId?: number | null;
    communityId?: number | null;
    title?: string | null;
    lastMessagePreview?: string | null;
    lastMessageAtUtc?: string | null;
};

export type ChatMessage = {
    messageId: string;
    conversationKey: string;
    senderId: string;
    senderName: string;
    content: string;
    sentAtUtc: string;
    isEdited: boolean;
    isDeleted: boolean;
};

export type ChatSendResult = {
    conversationCreated: boolean;
    conversationKey: string;
    message: ChatMessage;
};

export type SendDirectMessageRequest = {
    targetUserId: number;
    content: string;
    clientMessageId?: string;
};

export type SendCommunityMessageRequest = {
    communityId: number;
    content: string;
    clientMessageId?: string;
};

export type ChatInboxResponse = ApiResponse<ChatConversationSummary[]>;
export type ChatMessagesResponse = ApiResponse<ChatMessage[]>;
export type ChatSendResponse = ApiResponse<ChatSendResult>;

export type DetailUserFollow = {
    id: number;
    avatar: string;
    displayName: string;
};

export type ChatCandidatesResponse = ApiResponse<DetailUserFollow[]>;
