# Chat Realtime System Design

## Muc tieu

He thong chat can dap ung 3 rule nghiep vu:

- chat user-user chi duoc mo khi 2 ben da follow nhau hai chieu
- chat user-group chi duoc mo khi user da duoc add vao group va trang thai membership la active
- conversation chi duoc tao khi tin nhan dau tien duoc gui thanh cong, khong tao khi user chi click vao UI

## Phan bo du lieu

### MySQL / EF Core

Dung cho metadata va access control:

- `ChatConversations`
- `ChatConversationParticipants`
- `CommunityMemberships`
- `UserFollows`
- `last_message_preview`
- `last_message_at_utc`

### Cassandra

Dung cho message stream so luong lon:

- lich su message theo `conversation_key`
- doc trang dau va phan trang nguoc theo thoi gian
- toi uu write-heavy va read theo partition

## Conversation key

De tranh tao trung conversation, key nen xac dinh theo nghiep vu:

- direct: `dm:{minUserId}:{maxUserId}`
- community: `group:{communityId}`

## Luong gui tin nhan

1. Client goi command gui tin nhan.
2. Server xac thuc JWT va lay `userId`.
3. Check rule nghiep vu:
   - direct: A follow B va B follow A
   - community: membership active
4. Tim conversation theo key.
5. Neu chua co conversation, chi tao object trong memory.
6. Ghi message vao Cassandra.
7. Neu ghi Cassandra thanh cong:
   - persist `ChatConversation` vao MySQL neu day la message dau tien
   - cap nhat `LastMessagePreview`, `LastMessageAtUtc`
8. Broadcast qua SignalR:
   - `conversation:{conversationKey}` cho man hinh chat dang mo
   - `user:{userId}` cho inbox/update list

## Scale-out

De scale nhieu instance:

- SignalR can co Redis backplane hoac Azure SignalR
- Cassandra dung lam message store chinh
- MySQL giu metadata va rule nghiep vu
- Redis co the dung them cho presence va unread cache
- Kafka chi can neu muon event-driven fanout, analytics, moderation, push notification

## Bang Cassandra de xuat

```sql
CREATE KEYSPACE IF NOT EXISTS socialtech_chat
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

CREATE TABLE IF NOT EXISTS socialtech_chat.chat_messages_by_conversation (
  conversation_key text,
  sent_at_utc timestamp,
  message_id uuid,
  sender_user_id int,
  content text,
  client_message_id text,
  reply_to_message_id uuid,
  edited_at_utc timestamp,
  deleted_at_utc timestamp,
  state text,
  PRIMARY KEY ((conversation_key), sent_at_utc, message_id)
) WITH CLUSTERING ORDER BY (sent_at_utc DESC, message_id DESC);
```

## Thiet ke code trong repo

- [ChatConversation.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Domain/Entities/ChatConversation.cs)
- [ChatConversationParticipant.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Domain/Entities/ChatConversationParticipant.cs)
- [ChatAdapter.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Application/Services/ChatAdapter.cs)
- [CassandraChatMessageStore.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Infrastructure/chat/CassandraChatMessageStore.cs)
- [ChatHub.cs](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/Infrastructure/chat/ChatHub.cs)

## Ghi chu

Hien tai repo da duoc scaffold theo huong Cassandra that su tham gia vao design. De chat chay end-to-end, buoc tiep theo la:

- tao migration cho `ChatConversations` va `ChatConversationParticipants`
- tao keyspace va table Cassandra
- frontend/backend flow chi tiet nam o [chat-usage-flow.vi.md](/d:/Training/01-SocialTech/SocialBackEndW/SocialBackEnd/docs/chat-usage-flow.vi.md)
- them unread projection neu can inbox co counter chuan
