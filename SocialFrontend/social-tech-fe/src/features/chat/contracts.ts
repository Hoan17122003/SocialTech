import type { ApiResponse } from '@/common/types/api';

export type ChatConversationType = 'Direct' | 'Community';

export type ChatConversationSummary = {
    conversationKey: string;
    conversationType: ChatConversationType;
    publicTargetUserID?: string | null;
    communityId?: number | null;
    title?: string | null;
    nickName?: string | null;
    lastMessagePreview?: string | null;
    lastMessageAtUtc?: string | null;
};

export type RequestSetNickName = {
    conversationKey: string;
    nickName: string;
    userIdTarget?: number | null;
};

export type ChatMessage = {
    messageId: string;
    conversationKey: string;
    senderId: string;
    senderName: string;
    // Bổ sung senderNickName: Biệt danh của người gửi trong cuộc trò chuyện (nếu có)
    senderNickName?: string | null;
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
    targetPublicId: string
    content: string;
    clientMessageId?: string;
};

export type SendCommunityMessageRequest = {
    communityId: number;
    content: string;
    clientMessageId?: string;
};

export type EditChatMessageRequest = {
    conversationKey: string;
    messageId: string;
    newContent: string;
};

export type ChatInboxResponse = ApiResponse<ChatConversationSummary[]>;
export type ChatMessagesResponse = ApiResponse<ChatMessage[]>;
export type ChatSendResponse = ApiResponse<ChatSendResult>;

export type DetailUserFollow = {
    publicId: string;
    avatar: string;
    displayName: string;
};

export type ChatCandidatesResponse = ApiResponse<DetailUserFollow[]>;
