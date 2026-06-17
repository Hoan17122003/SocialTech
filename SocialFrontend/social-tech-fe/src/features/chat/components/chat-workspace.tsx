'use client';

import { useMemo } from 'react';
import { SectionShell } from '@/shared/ui/section-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { FormMessage } from '@/shared/ui/form-message';
import { useChatWorkspace } from '@/features/chat/use-chat-workspace';

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'No activity yet';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    }).format(new Date(value));
}

export function ChatWorkspace() {
    const {
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
    } = useChatWorkspace();

    const chatTargetLabel = useMemo(() => {
        if (!selectedConversation) {
            return draftMode === 'direct' ? 'Direct conversation draft' : 'Community conversation draft';
        }

        if (selectedConversation.conversationType === 'Direct') {
            return `Direct with user ${selectedConversation.otherUserId ?? 'unknown'}`;
        }

        return selectedConversation.title || `Community ${selectedConversation.communityId ?? ''}`;
    }, [draftMode, selectedConversation]);

    return (
        <div className="grid gap-10 animate-fade-in-up">
            <SectionShell
                eyebrow="Realtime Chat"
                title="Inbox, message stream va realtime conversation"
                description="Frontend nay ket noi truc tiep voi chat hub, dong bo inbox qua SignalR, va chi tao conversation khi tin nhan dau tien gui thanh cong o backend."
            >
                <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isConnected ? 'SignalR connected' : 'SignalR reconnecting'}
                    </span>
                    <span>Rule direct chat: two-way follow.</span>
                    <span>Rule community chat: active membership.</span>
                    <span>Conversation opens only after first successful message.</span>
                </div>
            </SectionShell>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1.8fr_1fr]">
                <Card className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Inbox</h3>
                            <p className="text-sm text-[var(--muted)]">Load from REST, keep updated by realtime events.</p>
                        </div>
                        <Button variant="secondary" className="px-4 py-2 text-xs" onClick={() => void refreshInbox()}>
                            {isLoadingInbox ? 'Loading...' : 'Refresh'}
                        </Button>
                    </div>

                    <Button variant="ghost" className="w-full justify-center border border-dashed border-[var(--line)]" onClick={() => startNewConversation('direct')}>
                        New direct chat
                    </Button>
                    <Button variant="ghost" className="w-full justify-center border border-dashed border-[var(--line)]" onClick={() => startNewConversation('community')}>
                        New community chat
                    </Button>

                    <div className="space-y-3">
                        {inbox.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                                No conversation yet. Send the first message to create one.
                            </div>
                        ) : null}

                        {inbox.map((conversation) => {
                            const isActive = conversation.conversationKey === selectedConversationKey;
                            const title =
                                conversation.title ||
                                (conversation.conversationType === 'Direct'
                                    ? `User ${conversation.otherUserId ?? 'unknown'}`
                                    : `Community ${conversation.communityId ?? 'unknown'}`);

                            return (
                                <button
                                    key={conversation.conversationKey}
                                    type="button"
                                    onClick={() => setSelectedConversationKey(conversation.conversationKey)}
                                    className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                                        isActive
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                            : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-hover)] hover:bg-[var(--background-soft)]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                                                {conversation.conversationType}
                                            </p>
                                        </div>
                                        <span className="text-xs text-[var(--muted)]">{formatDateTime(conversation.lastMessageAtUtc)}</span>
                                    </div>
                                    <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">
                                        {conversation.lastMessagePreview || 'No preview yet'}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                <Card className="flex min-h-[38rem] flex-col gap-4">
                    <div className="border-b border-[var(--line)] pb-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Active conversation</p>
                        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{chatTargetLabel}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                            {selectedConversationKey || 'No conversation selected yet.'}
                        </p>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                        {isLoadingMessages ? (
                            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--muted)]">
                                Loading messages...
                            </div>
                        ) : null}

                        {!isLoadingMessages && messages.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                                Select a conversation or start a new one from the right panel.
                            </div>
                        ) : null}

                        {messages.map((message) => (
                            <div
                                key={message.messageId}
                                className="max-w-[85%] rounded-[1.5rem] bg-[var(--background-soft)] px-4 py-3 text-[var(--foreground)]"
                            >
                                <div className="flex items-center justify-between gap-3 text-xs opacity-80">
                                    <span>{message.senderName}</span>
                                    <span>{formatDateTime(message.sentAtUtc)}</span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content || '[deleted]'}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Composer</p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Send a message</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                            Use direct mode for user-user and community mode for group chat.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-full border border-[var(--line)] bg-[var(--background-soft)] p-1">
                        <button
                            type="button"
                            onClick={() => setDraftMode('direct')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${draftMode === 'direct' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                        >
                            Direct
                        </button>
                        <button
                            type="button"
                            onClick={() => setDraftMode('community')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${draftMode === 'community' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                        >
                            Community
                        </button>
                    </div>

                    {selectedConversation ? (
                        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                            Sending into existing conversation.<br />
                            Target is locked to current thread.
                        </div>
                    ) : draftMode === 'direct' ? (
                        <label className="grid gap-2 text-sm text-[var(--muted)]">
                            Target user id
                            <input
                                value={directUserId}
                                onChange={(event) => setDirectUserId(event.target.value)}
                                inputMode="numeric"
                                placeholder="Example: 25"
                                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                            />
                        </label>
                    ) : (
                        <label className="grid gap-2 text-sm text-[var(--muted)]">
                            Community id
                            <input
                                value={communityId}
                                onChange={(event) => setCommunityId(event.target.value)}
                                inputMode="numeric"
                                placeholder="Example: 8"
                                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                            />
                        </label>
                    )}

                    <label className="grid gap-2 text-sm text-[var(--muted)]">
                        Message
                        <textarea
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            rows={8}
                            placeholder="Write your message here"
                            className="min-h-44 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                        />
                    </label>

                    {error ? <FormMessage type="error" message={error} /> : null}
                    {status ? <FormMessage type="success" message={status} /> : null}

                    <Button className="w-full justify-center" disabled={isSending} onClick={() => void sendMessage()}>
                        {isSending ? 'Sending...' : 'Send message'}
                    </Button>
                </Card>
            </div>
        </div>
    );
}
