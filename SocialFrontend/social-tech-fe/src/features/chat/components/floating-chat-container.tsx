'use client';

import { useChat } from '@/providers/chat-provider';
import { FloatingChatBox } from '@/features/chat/components/floating-chat-box';

export function FloatingChatContainer() {
    const { openChatBoxes } = useChat();

    if (openChatBoxes.length === 0) return null;

    return (
        <div className="fixed bottom-0 right-4 z-40 flex items-end gap-3 pointer-events-none pb-0">
            {openChatBoxes.map((key) => (
                <div key={key} className="pointer-events-auto">
                    <FloatingChatBox conversationKey={key} />
                </div>
            ))}
        </div>
    );
}
