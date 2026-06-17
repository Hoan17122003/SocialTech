# Chat Usage Flow

## Muc dich

Tai lieu nay mo ta:

- chat realtime duoc mo o dau
- khi nao can dung REST controller
- khi nao can dung SignalR hub
- luong frontend nen di nhu the nao
- khi nao conversation duoc tao

## 1. Realtime duoc mo o dau

Chat realtime khong duoc "kich hoat" bang controller.

No duoc mo qua SignalR hub:

- endpoint: `/chatHub`
- map trong `Program.cs` bang `app.MapHub<ChatHub>("/chatHub")`
- JWT duoc doc qua query `access_token` trong `SecurityConfigurationExtensions.cs`

Khi client connect thanh cong:

1. JWT duoc validate.
2. `ChatHub.OnConnectedAsync()` chay.
3. connection duoc add vao group `user:{userId}`.

Dieu nay co nghia la moi user online se co mot realtime channel rieng cho inbox/update.

## 2. Controller va Hub khac nhau the nao

### REST Controller

File: [ChatController.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Presentation/Controllers/ChatController.cs)

Dung cho:

- load inbox
- load lich su message
- gui tin nhan theo HTTP neu frontend muon dung REST

Endpoint hien tai:

- `GET /api/chat/inbox`
- `GET /api/chat/messages?conversationKey=...&take=50`
- `POST /api/chat/direct/send`
- `POST /api/chat/community/send`

### SignalR Hub

File: [ChatHub.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Infrastructure/chat/ChatHub.cs)

Dung cho:

- ket noi realtime
- join conversation group
- nghe message moi
- gui message bang websocket

Method hien tai:

- `GetInbox()`
- `GetMessages(conversationKey, take, beforeUtc)`
- `SendDirectMessage(request)`
- `SendCommunityMessage(request)`
- `JoinConversation(conversationKey)`
- `LeaveConversation(conversationKey)`

## 3. Luong direct chat

Dieu kien nghiep vu:

- user A follow user B
- user B follow user A

Luong:

1. User login va lay JWT.
2. Frontend connect `/chatHub?access_token=...`.
3. Frontend mo danh sach inbox bang:
   - `GetInbox()` qua SignalR
   - hoac `GET /api/chat/inbox` qua HTTP
4. User bam vao nguoi muon chat.
5. Neu chua co conversation thi frontend chi hien UI, chua tao box chat trong DB.
6. Khi user gui tin nhan dau tien:
   - goi `SendDirectMessage`
   - backend check follow hai chieu
   - backend build `conversationKey = dm:{minId}:{maxId}`
   - backend ghi message vao Cassandra
   - neu thanh cong moi persist `ChatConversation` vao MySQL
7. Backend broadcast:
   - `chat.message.created`
   - `chat.conversation.updated`
8. Frontend lay `conversationKey` tra ve va join `conversation:{conversationKey}`.

## 4. Luong group chat

Dieu kien nghiep vu:

- user da duoc add vao community/group
- membership co `Status = Active`

Luong:

1. User login va connect hub.
2. User mo man hinh group chat.
3. Neu conversation da ton tai thi frontend goi `JoinConversation(conversationKey)`.
4. Neu chua ton tai thi frontend chi hien UI group chat.
5. Khi user gui tin nhan dau tien:
   - goi `SendCommunityMessage`
   - backend check membership active
   - backend build `conversationKey = group:{communityId}`
   - backend ghi message vao Cassandra
   - neu thanh cong moi persist `ChatConversation` vao MySQL
6. Backend broadcast event moi vao group conversation.

## 5. Conversation duoc tao khi nao

Conversation khong duoc tao khi:

- user click vao avatar
- user mo popup chat
- user vao man hinh group chat
- user connect SignalR

Conversation chi duoc tao khi:

- request gui tin nhan dau tien hop le
- ghi message vao Cassandra thanh cong
- sau do metadata conversation moi duoc ghi vao MySQL

Day la rule quan trong de tranh tao nhieu box chat rong.

## 6. Event frontend can nghe

Frontend nen listen it nhat 2 event:

- `chat.message.created`
- `chat.conversation.updated`

Y nghia:

- `chat.message.created`: them message moi vao man hinh dang chat
- `chat.conversation.updated`: cap nhat inbox, preview, last message, sort order

## 7. Goi tu frontend nhu the nao

### Ket noi SignalR

```ts
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/chatHub", {
    accessTokenFactory: () => accessToken
  })
  .withAutomaticReconnect()
  .build();

await connection.start();
```

### Load inbox

```ts
const inbox = await connection.invoke("GetInbox");
```

hoac:

```ts
const response = await fetch("/api/chat/inbox", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### Gui direct message

```ts
const result = await connection.invoke("SendDirectMessage", {
  targetUserId: 25,
  content: "hello",
  clientMessageId: crypto.randomUUID()
});
```

### Join conversation sau khi co key

```ts
await connection.invoke("JoinConversation", result.conversationKey);
```

## 8. Du lieu luu o dau

### MySQL

Dung cho:

- `ChatConversations`
- `ChatConversationParticipants`
- metadata inbox
- access control theo participant

### Cassandra

Dung cho:

- message history
- phan trang lich su theo `conversation_key`
- write-heavy stream

## 9. Thu tu implementation cho frontend

Neu team frontend chua biet bat dau tu dau, nen di theo thu tu nay:

1. connect `chatHub`
2. load inbox
3. render man hinh chat
4. gui direct message
5. join conversation sau khi server tra `conversationKey`
6. nghe `chat.message.created`
7. nghe `chat.conversation.updated`
8. them flow community chat

## 10. Nhung dieu con thieu de chay production

- migration EF cho `ChatConversations` va `ChatConversationParticipants`
- tao keyspace va table Cassandra
- unread projection neu can badge chuan
- Redis backplane cho SignalR neu scale nhieu instance
- co che idempotency neu frontend retry `SendDirectMessage`
