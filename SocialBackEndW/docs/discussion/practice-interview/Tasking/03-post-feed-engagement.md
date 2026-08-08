# Post, Comment, Vote, Feed và Moderation

Baseline đã có article/comment CRUD nhưng còn nhiều seam production: client có thể gửi status, feed offset chưa lọc quyền, vote/report/save mới có entity/repository một phần, DB–MinIO–Kafka chưa atomic.

### [POST-01] Đăng bài vào community có capability check

**L2→L3 · SEC/DAT · resource authorization, membership status, server-owned state · 3 hướng · `ArticleAdapterPort`**

**Bối cảnh:** create/update nhận community/status từ client. **Invariant:** chỉ actor đủ quyền đăng; banned/left bị chặn; client không tự đặt `Published/Removed/Locked` ngoài command hợp lệ.

**Task:** tách command CreateDraft/Publish/MovePost và capability evaluator.

<details><summary>Phân rã và 3 hướng</summary>

Load community+membership tối thiểu → authorize → validate transition → persist. A guards trong service; nhanh. B resource authorization handler. C domain `PostingPolicy` trả capabilities/reason. DTO không bind trực tiếp domain enum nhạy cảm. Move post cần quyền cả source/target và ảnh hưởng feed/chat/search.
</details>

<details><summary>Thinking/test</summary>

Junior check author/community; Middle matrix role/status/visibility và deny-by-default; Senior chống TOCTOU với membership change, cache stale, audit và policy version. Test forged status, banned user, membership revoked giữa read/write.
</details>

### [POST-02] Post lifecycle state machine

**L3 · DAT/CON · Draft, Published, Hidden, Removed, Locked, transition matrix · 3 hướng · `PostStatus`**

**Bối cảnh:** author/moderator có quyền transition khác nhau. **Invariant:** `PublishedAtUtc` chỉ set đúng; moderator removal không bị author restore; stale edit không overwrite removal.

**Task:** viết command/domain methods, concurrency token và exhaustive transition tests.

<details><summary>Brainstorm</summary>

A switch `(state,command,actor)`; rõ và đủ. B domain methods `Publish/Hide/Remove/Restore/Lock`; discoverable. C State pattern khi workflow thực sự phức tạp. Dùng expected version/row version hoặc conditional update; 409 trả current state và allowed actions.
</details>

<details><summary>Level thinking/DoD</summary>

Junior gán enum; Middle transition matrix+auth+optimistic concurrency; Senior reason/audit, scheduled transition, event version và rolling migration. Property test mọi state/command/actor không tạo trạng thái bất hợp lệ.
</details>

### [POST-03] Reply comment đúng cây và giới hạn độ sâu

**L2→L3 · DAT/SEC · adjacency list, parent validation, max depth · 3 hướng · comment creation**

**Bối cảnh:** parent có thể thuộc post khác; depth phải do server tính. **Invariant:** parent cùng post, còn hợp lệ, không cycle, depth ≤ limit.

**Task:** sửa contract nullable root, tính depth và thiết kế response tree/pagination.

<details><summary>3 cách modeling</summary>

A adjacency list hiện có, query parent và set `Depth+1`; phù hợp. B materialized path cho subtree reads; write/move phức tạp. C closure table; query mạnh, nhiều rows. Không nhận `Depth` đáng tin từ client; bỏ sentinel `int.MinValue` để dùng nullable rõ nghĩa.
</details>

<details><summary>Thinking/test</summary>

Junior gán ParentId; Middle cross-post/deleted parent/depth; Senior chọn model theo query, payload explosion, moderation tombstone và pagination root/subtree. Test forged parent và concurrent parent deletion.
</details>

### [POST-04] Comment tree pagination không N+1

**L3 · DAT/PRF · recursive CTE, projection, root cursor · 4 hướng · comment repository**

**Bối cảnh:** cần hiển thị comments/replies lớn mà không query từng node. **Invariant:** thứ tự ổn định, không mất replies do page root, payload bounded.

**Task:** thiết kế API contract rồi đo query count/rows/latency.

<details><summary>4 hướng</summary>

A page roots rồi query descendants trong một/tập query. B recursive CTE. C flattened page với `ParentId`, client assemble. D materialized path. Quyết định “page top-level + preview N replies” thường tốt hơn trả toàn cây. Batch-load authors/attachments bằng projection, tránh `Include` graph khổng lồ.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior recursion repository; Middle query count và cursor; Senior UX contract, max subtree, hot post, cache và execution plan. Với 100k comments, request không load toàn bảng và số query bounded.
</details>

### [POST-05] Soft-delete comment có replies và attachment

**L3 · DAT/DST · tombstone, retention, async cleanup · 3 hướng · delete comment flow**

**Bối cảnh:** hard delete có thể phá cây/FK và file cleanup. **Invariant:** replies vẫn giữ context placeholder; content không còn public; cleanup retry được.

**Task:** state/delete policy, DTO redaction và attachment cleanup workflow.

<details><summary>Các cách</summary>

A luôn tombstone status/content redaction. B hard-delete leaf, tombstone non-leaf. C tombstone trước, scheduled purge theo retention. File evidence có thể cần giữ cho moderation, nên không luôn xóa ngay. Bỏ `.Result` trong async delete path; side effect object storage phải idempotent.
</details>

<details><summary>Thinking/test</summary>

Junior đổi status; Middle tree/FK/attachment; Senior legal/audit, author-vs-moderator deletion, search/cache invalidation và late events. Test delete parent concurrent reply creation bằng transaction/conditional guard.
</details>

### [POST-06] Vote state machine race-safe

**L3 · CON/DAT · unique constraint, upsert, delta, idempotency · 3 hướng · `PostVote/CommentVote`**

**Bối cảnh:** add up/down, change và remove dưới concurrent/retry. **Invariant:** một vote/user/target; score = up−down; request semantic deterministic.

**Task:** chọn API (`PUT desired state` được khuyến nghị hơn toggle), transaction và concurrent tests.

<details><summary>3 hướng</summary>

A read-update transaction + unique violation retry; portable. B MySQL upsert/conditional SQL; ít round trip. C append vote events + projection; scale/audit nhưng eventual. `PUT {vote: Up/Down/None}` idempotent; “toggle” không idempotent khi network retry. Nếu denormalized score, delta None→Up +1, Up→Down −2… trong cùng transaction.
</details>

<details><summary>Thinking/acceptance</summary>

Junior check then insert; Middle DB constraint arbiter, affected rows/delta; Senior hot-row contention, event ordering, reconciliation và abuse. 100 concurrent desired-state requests cuối cùng đúng state và score query truth.
</details>

### [POST-07] Save/unsave post và privacy thay đổi

**L2→L3 · DAT/SEC · idempotent CRUD, composite key, stale authorization · 3 hướng · `UserSavedPost`**

**Bối cảnh:** entity có sẵn nhưng chưa feature. **Invariant:** save không trùng; saved list không làm lộ post sau khi private/remove/ban.

**Task:** endpoints, keyset list, authorization filter và behavior khi target mất quyền.

<details><summary>Hướng làm</summary>

A DB unique + insert/delete desired state; source of truth. B upsert command. C Redis set làm cache, không thay DB. Khi read phải join/filter current visibility, không tin quyền lúc save. Chọn giữ hidden saved record để hiện lại nếu quyền phục hồi hay cleanup async; ghi rõ policy.
</details>

<details><summary>Thinking/test</summary>

Junior CRUD; Middle idempotency/pagination/auth; Senior stale cache, privacy, retention và bulk cleanup. Test save concurrent và community chuyển private/banned sau save.
</details>

### [POST-08] Feed community bằng keyset cursor

**L3 · DAT/PRF/SEC · seek pagination, stable sort, opaque cursor · 3 hướng · `PostRepository`**

**Bối cảnh:** offset feed drift/chậm và chưa lọc Published/quyền. **Invariant:** không duplicate/skip do post mới; tie-break deterministic; authorization nằm trong query.

**Task:** cursor `(PublishedAtUtc,Id)`, DTO projection, signed/opaque cursor và index plan.

<details><summary>Phân rã/cách</summary>

A offset cho admin/trang nhỏ. B keyset predicate `(time < t) OR (time=t AND id<id)` với sort DESC. C driver/database cursor không phù hợp HTTP stateless dài hạn. Index đề xuất theo equality predicates trước: `(CommunityId, Status, PublishedAtUtc, Id)`; validate bằng `EXPLAIN`, không chỉ thêm index.
</details>

<details><summary>Thinking/DoD</summary>

Junior page/pageSize; Middle composite cursor/projection; Senior snapshot vs live feed semantics, cursor version/tamper, deleted rows và p99. Integration test inserts giữa page 1/2.
</details>

### [POST-09] Personalized home feed

**L4 · DAT/DST/PRF · fan-out-on-read/write, dedupe, ranking · 4 hướng · follow+membership+post**

**Bối cảnh:** feed gồm author follow và community join, loại blocked/private/removed. **Invariant:** không lộ content; một post chỉ một lần; freshness/SLO rõ.

**Task:** ước lượng cardinality rồi làm baseline và một optimized version.

<details><summary>4 kiến trúc</summary>

A SQL fan-out-on-read union/query; đơn giản, tốt scale hiện tại. B precomputed `UserFeedItems` fan-out-on-write; đọc nhanh, write amplification. C fan-out-on-read cache. D hybrid: celebrity on-read, normal on-write. Phải xử lý follow/join sau publish, delete/edit, pagination/ranking và rebuild.
</details>

<details><summary>Junior / Middle / Senior</summary>

Junior lấy IDs rồi `Contains`; Middle query set-based, dedupe/index/cursor; Senior capacity fan-out, hot author, freshness lag, cost/reconciliation và migration. Load distribution phải có normal+celebrity, không chỉ uniform.
</details>

### [POST-10] Trending score chống thiên vị bài cũ

**L3→L4 · PRF/DAT · time decay, Wilson score, velocity, batch projection · 3 hướng · feature mới**

**Bối cảnh:** sort raw vote làm post cũ thống trị. **Invariant:** formula deterministic, bài mới có cơ hội, chống gaming cơ bản.

**Task:** so 3 formula trên fixture, chọn window/update strategy và metric success.

<details><summary>Brainstorm</summary>

A score có exponential/log time decay khi query. B materialized trending score tính mỗi vài phút. C stream aggregation từ engagement events. Wilson phù hợp quality ratio; velocity phù hợp “đang nóng”. Đừng chọn formula trước khi định nghĩa product objective, eligible window, bot/spam signals.
</details>

<details><summary>Thinking/test</summary>

Junior sort score; Middle formula+time window+batch; Senior experiment/A-B, explainability, attack resistance, late/duplicate events và rollback. Fixture phải gồm new-small, old-large, controversial và burst-bot.
</details>

### [POST-11] View counter không lost update và không hot-row

**L3→L4 · CON/DST · atomic increment, Redis, write-behind · 3 hướng · `Post.ViewCount`**

**Bối cảnh:** load-increment-save mất update; hot post làm row contention. **Invariant:** policy “view” rõ, count không âm/double do retry ngoài mong muốn.

**Task:** implement baseline atomic SQL rồi Redis/event alternative và reconciliation.

<details><summary>3 hướng</summary>

A SQL `SET ViewCount=ViewCount+1`; correct atomic, hot row. B Redis `INCR`, periodically flush delta idempotently. C view events → aggregate; analytics tốt nhưng eventual/cost. Unique view cần dedupe user/session/window, không chỉ counter primitive. Write-behind phải atomically claim/reset delta hoặc dùng cumulative monotonic value.
</details>

<details><summary>Level thinking/DoD</summary>

Junior `entity++`; Middle atomic DB/Redis; Senior product definition, bot/privacy, durability, hot key sharding và repair. Stress test concurrent increments; compare source event/Redis/DB after forced crash.
</details>

### [POST-12] Report target XOR và chống spam

**L3 · SEC/DAT/CON · check constraint, polymorphic target, cooldown · 3 hướng · `ContentReport`**

**Bối cảnh:** report phải trỏ đúng post hoặc comment, target thuộc community và user nhìn thấy. **Invariant:** chính xác một target; active duplicate theo policy; forged ID không bypass.

**Task:** validation+DB constraint, idempotency/cooldown và threat tests.

<details><summary>Các cách</summary>

A nullable PostId/CommentId + DB XOR check; phù hợp hiện model. B tách PostReport/CommentReport; FK mạnh, code trùng. C generic target type/id; mở rộng nhưng DB integrity yếu. Unique reporter+target+active state hoặc conditional semantics; Redis rate limit chỉ lớp abuse, không thay constraint.
</details>

<details><summary>Thinking/test</summary>

Junior required field; Middle target auth/unique race; Senior malicious reporting, reopen/resolution policy, evidence retention và rate-limit fairness. Fuzz combinations null/both/cross-community/removed/private.
</details>

### [POST-13] Moderator claim queue và resolve atomically

**L4 · CON/DAT · compare-and-swap, lease, `SKIP LOCKED`, state machine · 4 hướng · report workflow**

**Bối cảnh:** hai moderators claim cùng report; crash để claim treo. **Invariant:** một active assignee; lease hết có thể reclaim; resolve và action content nhất quán.

**Task:** claim/renew/release/resolve endpoints, permission và concurrent worker test.

<details><summary>4 hướng</summary>

A conditional `UPDATE ... WHERE Status=Pending`; check affected row. B optimistic version token. C `SELECT FOR UPDATE SKIP LOCKED` cho pull queue. D distributed queue. Claim nên có `LeaseUntil`, fencing/version để stale moderator không resolve sau reassignment. Resolve+remove/lock content cùng transaction; external notification qua outbox.
</details>

<details><summary>Thinking/acceptance</summary>

Junior read then set; Middle CAS/transaction; Senior fairness, stale lease, multi-report one target, audit/appeal và operational backlog. Test pause claimant quá lease rồi old/new resolve race.
</details>

### [POST-14] Post + attachments + event không rơi vào dual-write gap

**L4→L5 · DST/DAT · saga, pending state, outbox, orphan reconciliation · 4 hướng · EF+MinIO+Kafka**

**Bối cảnh:** DB, object storage và Kafka không có transaction chung. **Invariant:** không public post trỏ file thiếu; event cuối cùng phát; orphan được tìm/xóa.

**Task:** failure matrix mọi boundary, chọn authoritative commit point và implement recovery.

<details><summary>4 hướng</summary>

A upload trước, DB transaction, compensation delete: đơn giản nhưng cleanup có thể fail. B DB `Pending`, upload, finalize `Published`; recoverable. C staging object prefix + finalize worker. D presigned direct upload session, client finalize + DB outbox. Event phải nằm outbox cùng post finalize; consumer idempotent. Orphan sweeper/reconciliation là safety net bắt buộc.
</details>

<details><summary>Senior thinking/DoD</summary>

Junior try/catch; Middle compensation/state; Senior failure matrix, idempotency keys, object lifecycle, user-visible status, reconciliation metrics và rolling migration. Kill process sau từng operation, restart hội tụ đúng mà không cần sửa tay.
</details>
