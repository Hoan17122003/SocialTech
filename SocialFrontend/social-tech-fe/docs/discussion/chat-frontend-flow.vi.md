# Chat frontend flow

## Route moi

- `/chat`

## Tinh nang da noi vao frontend

- chat page trong `src/app/(workspace)/chat/page.tsx`
- realtime hook trong `src/features/chat/use-chat-workspace.ts`
- REST client trong `src/features/chat/chat-api.ts`
- SignalR client trong `src/shared/api/realtime-client.ts`

## Luong su dung

1. Dang nhap de co access token.
2. Mo `/chat`.
3. Frontend ket noi `chatHub` qua SignalR.
4. Inbox duoc load lan dau qua REST va tiep tuc cap nhat qua realtime event.
5. Chon conversation co san hoac bam `New direct chat` / `New community chat`.
6. Gui tin nhan dau tien.
7. Backend tra `conversationKey` va frontend join conversation do.

## Event frontend dang nghe

- `chat.message.created`
- `chat.conversation.updated`

## Luu y nghiep vu

- direct chat can follow hai chieu
- community chat can membership active
- conversation khong tao luc click, chi tao luc gui tin nhan dau tien thanh cong
