# Chat, Media và vòng đời dữ liệu nhiều store

Quy tắc: với mọi feature, chỉ rõ source of truth giữa MySQL, Cassandra, Elasticsearch, MinIO, Redis và Kafka; định nghĩa cách repair khi chúng lệch.

### [LIFE-01] Message identity và sequence

**L3 · Chat · idempotency, ordering**

**Đề bài:** mobile retry send, nhiều API node và client offline; message không duplicate và có thứ tự ổn định trong conversation.

<details><summary>Gợi ý</summary>
ClientMessageId unique theo sender/conversation, server MessageId và per-conversation sequence/timeuuid. Nêu ordering scope, clock skew và hot conversation limitation.
</details>

### [LIFE-02] Conversation summary projection

**L4 · MySQL/Cassandra · projection, out-of-order**

**Đề bài:** inbox cần last message, unread và updated time; message edit/delete/late arrival không làm summary lùi.

<details><summary>Gợi ý</summary>
Conditional update theo sequence/version; summary là projection rebuildable. Tách participant-specific read state; reconciliation scan bounded.
</details>

### [LIFE-03] Read receipt quy mô nhóm lớn

**L3 · Chat data model · high-water mark**

**Đề bài:** group 10.000 người; không tạo receipt cho từng message-user nếu không cần, nhiều device update lệch thứ tự.

<details><summary>Gợi ý</summary>
Lưu last-read sequence mỗi participant, monotonic conditional update. “Ai đã đọc message” có cost khác “unread của tôi”; contract phải giới hạn query.
</details>

### [LIFE-04] Edit/delete message xuyên store

**L4 · Versioned event · Cassandra/Elasticsearch**

**Đề bài:** edit/delete cập nhật chat store, search, summary và connected clients; event có thể duplicate/out-of-order.

<details><summary>Gợi ý</summary>
Message version/tombstone, conditional projection update và immutable audit theo retention. Hard delete khác user-facing delete; late create không được resurrect deleted message.
</details>

### [LIFE-05] Offline delta synchronization

**L4 · Sync protocol · cursor, tombstone**

**Đề bài:** client offline 30 ngày reconnect và cần delta conversations/messages/membership, không tải lại toàn bộ.

<details><summary>Gợi ý</summary>
Per-domain change cursor/high-water mark, tombstone retention dài hơn offline support. Cursor opaque/versioned; nếu quá retention thì full resync có kiểm soát.
</details>

### [LIFE-06] Slow SignalR client

**L3 · Realtime · bounded queue, backpressure**

**Đề bài:** client mạng yếu không đọc kịp, server không được giữ queue vô hạn hoặc làm chậm cả group.

<details><summary>Gợi ý</summary>
Per-connection bounded outbound queue; coalesce presence/typing, nhưng message durable phải sync lại từ store. Chọn drop/disconnect và metric queue depth/age.
</details>

### [LIFE-07] Group membership đổi trong lúc gửi

**L4 · Authorization · temporal membership**

**Đề bài:** user bị kick đồng thời message được gửi; xác định user có được nhận/đọc message tại boundary nào.

<details><summary>Gợi ý</summary>
Business contract theo membership version/effective time. SignalR group chỉ là delivery optimization, read API phải authorize từ source of truth; cache deny invalidation nhanh.
</details>

### [LIFE-08] Attachment upload/finalize

**L3 · MinIO/MySQL · state machine**

**Đề bài:** upload object trước khi gửi message; object orphan dọn sau 24 giờ, race cleanup/finalize không xóa nhầm.

<details><summary>Gợi ý</summary>
Uploading→Quarantined→Ready→Attached; conditional transition và ownership. Cleanup claim theo version/lease, finalize idempotent; scan malware trước public access.
</details>

### [LIFE-09] Media transformation pipeline

**L4 · Kafka/worker · thumbnail, transcoding**

**Đề bài:** tạo nhiều rendition ảnh/video, bounded CPU/GPU, retry không tạo object rác và client thấy progress.

<details><summary>Gợi ý</summary>
Transformation job key `(SourceId,ProfileVersion)`, idempotent target key, per-stage status và resource-specific queues. Validate output checksum/metadata rồi atomic publish manifest.
</details>

### [LIFE-10] Malware quarantine và release

**L4 · Security workflow · quarantine, appeal**

**Đề bài:** scanner timeout/false positive; object chưa sạch không được cấp URL, moderator có thể review.

<details><summary>Gợi ý</summary>
Bucket/prefix hoặc policy quarantine riêng, immutable scan result/version, retry budget và manual override audit. Re-scan khi engine/signature đổi.
</details>

### [LIFE-11] Tiered storage cho chat

**L4 · Hot/warm/cold · archive, restore**

**Đề bài:** message >1 năm chuyển sang object storage/Parquet; user vẫn có thể tải lịch sử với latency cao hơn.

<details><summary>Gợi ý</summary>
Manifest/index range→tier, immutable archive checksum, restore/on-demand query contract. Tombstone/privacy deletion phải áp dụng cho archive; đo cost và retrieval SLO.
</details>

### [LIFE-12] Retention policy theo community

**L4 · Data lifecycle · legal hold**

**Đề bài:** community chọn giữ chat 30 ngày/1 năm/vĩnh viễn; legal hold ngăn purge một số conversation.

<details><summary>Gợi ý</summary>
Versioned policy/effective date, deletion candidate + hold exclusion, two-phase purge và audit. Policy mới có áp ngược hay không là Product/legal decision.
</details>

### [LIFE-13] User deletion và shared content

**L4 · Privacy · anonymize vs delete**

**Đề bài:** account bị xóa nhưng group chat cần giữ tính liên tục; avatar/media/search/profile cache phải biến mất.

<details><summary>Gợi ý</summary>
Phân loại owned/shared/regulated data; pseudonymous author tombstone cho shared record nếu policy cho phép. Deletion saga, late event suppression và proof/reconciliation.
</details>

### [LIFE-14] Cross-store backup consistency

**L5 · Backup · recovery point manifest**

**Đề bài:** backup MySQL, Cassandra, MinIO và Elasticsearch tại thời điểm khác nhau; restore vẫn tạo trạng thái hợp lệ.

<details><summary>Gợi ý</summary>
Elasticsearch là rebuildable projection; MinIO object cần manifest/checksum; MySQL high-water event offset nối với Cassandra/Kafka. Chọn authoritative stores và replay/reconcile sau restore.
</details>

### [LIFE-15] Chat conversation split/merge

**L5 · Data migration · identity, redirects**

**Đề bài:** tách một group lớn thành channels hoặc merge duplicate direct conversation mà vẫn giữ history/cursor/link.

<details><summary>Gợi ý</summary>
Không nhất thiết rewrite mọi message; conversation alias/segment mapping, participant entitlements và cursor translation. Migration online, shadow read, rollback và audit.
</details>

### [LIFE-16] Multi-store reconciliation platform

**L5 · Data integrity · drift detection**

**Đề bài:** tạo công cụ đối chiếu MySQL metadata, Cassandra messages, Elasticsearch docs và MinIO objects theo sample/full scan.

<details><summary>Tiêu chí hoàn thành</summary>
Canonical identity/version, checksum/count by partition, dry-run/repair, bounded concurrency, checkpoint, expected-version writes, metrics và evidence. Không tự sửa ambiguity không có business rule.
</details>
