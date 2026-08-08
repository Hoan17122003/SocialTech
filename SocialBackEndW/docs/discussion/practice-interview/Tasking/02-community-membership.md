# Community, Membership, Role và Rule

Đây là bounded context còn thiếu application service/controller dù entity, repository và unique `(CommunityId, UserId)` đã có. Vì vậy rất phù hợp để luyện từ CRUD đến state machine và concurrency thật.

### [COM-01] Tạo community và owner atomically

**L2→L3 · DAT/CON · transaction, unique slug, aggregate invariant · 3 hướng · `Community`, `CommunityMembership`**

**Bối cảnh:** tạo community phải sinh owner membership. **Invariant:** community tồn tại thì có đúng một owner active ban đầu; slug duy nhất; không community mồ côi.

**Task:** thiết kế API/service/repository, transaction và concurrent test hai request cùng slug.

<details><summary>Phân rã và 3 cách</summary>

Tách validate input/slug → create aggregate → save two rows → map duplicate. A EF transaction/use-case một `SaveChanges`; hợp lý nhất hiện tại. B domain factory tạo community+membership rồi aggregate persistence; invariant dễ thấy. C stored procedure; atomic nhưng coupling MySQL. Unique index, không `AnyAsync`, là arbiter cuối của race.
</details>

<details><summary>Junior / Middle / Senior</summary>

Junior CRUD hai bảng; Middle rollback và map `DbUpdateException` thành 409; Senior nghĩ idempotency key, slug normalization/collation, audit và migration. Test failure giữa inserts và 30 concurrent creates: chỉ một aggregate hợp lệ.
</details>

### [COM-02] Visibility và resource authorization

**L2→L3 · SEC/DAT · Public/Restricted/Private, IDOR, policy handler · 3 hướng · community queries/chat/post**

**Bối cảnh:** query visible hiện chưa nhận user context và có thể lộ restricted/private. **Invariant:** discover, read, post và chat là bốn capability riêng; deny-by-default.

**Task:** lập authorization matrix rồi áp dụng nhất quán cho detail, feed, post creation và community chat.

<details><summary>Brainstorm và hướng làm</summary>

A `if` trong từng service: nhanh nhưng dễ drift. B resource-based `IAuthorizationHandler`: tái dùng, cần load resource/membership. C `CommunityCapabilityService`/specification dùng ở query và command: domain rõ. Có thể cache snapshot public và capability user riêng; không cache DTO có dữ liệu private bằng key chung.
</details>

<details><summary>Level thinking/test</summary>

Junior kiểm tra enum; Middle centralize policy và test mọi actor/status; Senior tách discoverability/content visibility, chống timing/existence oracle, cache invalidation khi ban. Dùng matrix guest/member/banned/mod/owner × public/restricted/private.
</details>

### [COM-03] Join community theo state machine

**L3 · DAT/CON · PendingApproval, Active, Left, Banned, idempotency · 3 hướng · membership repository**

**Bối cảnh:** public join khác private approval; retry/concurrent join không tạo duplicate. **Invariant:** một row/user/community, transition hợp lệ, banned không tự join.

**Task:** viết transition table, domain commands `RequestJoin/Approve/Reject/Rejoin` và test stale/concurrent requests.

<details><summary>Phân rã và 3 cách</summary>

Liệt kê current state × actor × command × next state. A branch trong service; đủ khi ít state. B domain methods bảo vệ invariant. C data-driven transition table/command handlers; dễ audit/mở rộng. Khi insert race, catch unique rồi reload current state; với update dùng concurrency token/conditional update.
</details>

<details><summary>Tư duy và acceptance</summary>

Junior tạo endpoint join; Middle idempotency/authorization/409; Senior state-machine version, audit reason, notification outbox và rollout từ dữ liệu cũ. Property tests không transition nào đi trực tiếp `Banned→Active` qua user action.
</details>

### [COM-04] Leave/rejoin và invariant owner cuối

**L3→L4 · CON/DAT · last-owner race, conditional update, lock ordering · 4 hướng · membership roles**

**Bối cảnh:** hai owner cùng leave có thể đều thấy “còn owner khác” rồi để community vô chủ. **Invariant:** luôn ít nhất một owner active hoặc community chuyển trạng thái closed/deleted có chủ đích.

**Task:** tái hiện TOCTOU và chọn cơ chế bảo vệ invariant nhiều row.

<details><summary>4 hướng xử lý</summary>

A serializable transaction đếm+update; đơn giản nhưng contention/deadlock cần retry. B lock community row `FOR UPDATE` rồi thay đổi memberships theo một lock order. C lưu `OwnerUserId` trên community và CAS transfer; invariant gọn nhưng model một owner. D serialize commands theo community queue; multi-node cần durable partition. App-level check đơn thuần không đủ.
</details>

<details><summary>Thinking/test</summary>

Junior `Count > 1`; Middle transaction và concurrent integration test; Senior chọn model one/multi-owner, lock scope, deadlock retry, availability và emergency admin recovery. Test `Barrier` cho hai requests cùng vượt check.
</details>

### [COM-05] Transfer owner và quản lý moderator

**L3 · SEC/CON · RBAC, atomic transfer, least privilege · 3 hướng · role enum**

**Bối cảnh:** role change là security-sensitive. **Invariant:** chỉ actor đủ capability; target active; transfer không có khoảng không owner hoặc hai owner ngoài policy.

**Task:** API role change có audit, concurrency token và stale-client response.

<details><summary>Cách chia nhỏ/hướng làm</summary>

Tách authorize actor → validate target/state → apply transition → audit/notify. A transaction update hai rows. B conditional bulk SQL với version. C community aggregate load required memberships. Đừng cho client gửi trực tiếp arbitrary enum; expose commands Promote/Demote/TransferOwnership.
</details>

<details><summary>Level thinking/DoD</summary>

Junior so `Role==Owner`; Middle capability matrix, target validation và atomic transaction; Senior TOCTOU giữa auth và update, session/cache revocation, immutable audit và incident response. Test demote self, banned target, two transfers concurrent.
</details>

### [COM-06] Invite link single-use/multi-use có quota

**L3 · SEC/CON · opaque token, hashed secret, atomic usage count, expiry · 3 hướng · feature mới**

**Bối cảnh:** owner mời user vào private community. **Invariant:** token khó đoán, không lưu plaintext, đúng community/expiry/quota, banned user không bypass.

**Task:** model invite lifecycle và concurrent redeem khi chỉ còn một lượt.

<details><summary>Brainstorm 3 cách</summary>

A signed JWT invite: stateless nhưng revoke/usage quota cần state. B opaque random token, DB lưu hash + conditional `UsedCount < MaxUses`; phù hợp nhất. C Redis reservation + DB membership; nhanh nhưng dual-state/recovery. Redeem phải transaction invite reservation + membership transition; duplicate redeem cùng user idempotent.
</details>

<details><summary>Thinking/test</summary>

Junior token+expiry; Middle hash, atomic counter, authorization; Senior abuse/rate limit, revocation, audit, race quota=1 và privacy của invite metadata. Load 20 concurrent redeems, đúng quota thành công.
</details>

### [COM-07] CRUD và reorder community rules

**L2→L3 · DAT/CON · optimistic concurrency, gap ordering, batch update · 3 hướng · `CommunityRule`**

**Bối cảnh:** nhiều moderator reorder cùng lúc có thể mất update. **Invariant:** active rules có thứ tự deterministic và quyền sửa đúng community.

**Task:** implement create/update/archive/reorder với version/conflict response.

<details><summary>3 chiến lược ordering</summary>

A transaction đánh lại 1..N; dễ nhưng write nhiều. B gap 100/200 và renumber khi hết gap. C fractional/rank string; reorder rẻ nhưng complexity. Client gửi expected version/list id; server validate đủ/không duplicate. Rules đã dùng để moderation nên archive thay vì hard delete khi cần audit.
</details>

<details><summary>Level thinking/test</summary>

Junior CRUD/display order; Middle batch transaction+authorization; Senior write frequency, conflict UX, audit snapshot và cache invalidation. Test two stale reorder operations: một thắng, một 409 chứ không silent lost update.
</details>

### [COM-08] Member search và keyset pagination

**L2→L3 · DAT/PRF · projection, composite cursor, index, N+1 · 3 hướng · `GetMembersByCommunityAsync`**

**Bối cảnh:** repository đang load toàn bộ member và include User. **Invariant:** ổn định khi có join mới, không lộ private fields, không load cả community.

**Task:** filter status/role/query, cursor `(CreatedAtUtc,Id)`, DTO projection và execution-plan evidence.

<details><summary>Phân rã/hướng</summary>

A offset cho admin list nhỏ; B keyset theo created/id; C search riêng bằng normalized display name/Elastic khi lớn. Projection chỉ chọn public id/name/avatar key/role. Index bắt đầu từ predicate equality `(CommunityId, Status, CreatedAtUtc, Id)`; search name có yêu cầu khác, đừng tạo index theo cảm tính.
</details>

<details><summary>Thinking/acceptance</summary>

Junior `Skip/Take`; Middle keyset+projection+AsNoTracking; Senior API cursor opaque/versioned, authorization filter trong query, index write cost và p99 plan. Seed 100k members, đo rows scanned/latency.
</details>

### [COM-09] MemberCount/PostCount không drift

**L3→L4 · DAT/DST · denormalized counter, atomic delta, reconciliation · 3 hướng · community counters**

**Bối cảnh:** entity có counter nhưng chưa có strategy. **Invariant:** định nghĩa rõ count Active/Published; không âm; retry không double increment.

**Task:** chọn consistency model, triển khai update và repair job.

<details><summary>3 cách và trade-off</summary>

A `COUNT` lúc đọc: luôn đúng, có thể đắt. B transaction membership/post + atomic delta: nhanh đọc, mọi path phải đúng. C event projection: decouple/scale nhưng eventual và duplicate/out-of-order. Với B/C vẫn cần reconciliation `SET counter = authoritative COUNT`, dry-run và metric drift.
</details>

<details><summary>Level thinking/test</summary>

Junior tăng/giảm property; Middle tính delta theo transition và idempotency; Senior source of truth, hot row contention, lag SLO, repair/backfill rollout. Randomized state-transition test rồi so counter với query truth.
</details>

### [COM-10] Community moderation audit log và appeal

**L4 · SEC/DAT/OBS · append-only audit, evidence, appeal state machine · 3 hướng · reports/memberships/posts**

**Bối cảnh:** ban/remove/role change cần giải thích và khôi phục. **Invariant:** audit immutable, actor/time/reason/before-after đầy đủ; appeal không tự undo.

**Task:** thiết kế audit schema, command interception/domain event, query cho moderator/user và retention.

<details><summary>Brainstorm</summary>

A service ghi audit trong cùng transaction; rõ nhưng dễ quên command mới. B domain events → audit table trong transaction; tốt hơn về coverage. C event sourcing bounded context; mạnh nhưng quá sức nếu chỉ cần audit. Evidence snapshot có thể chứa PII, cần access/retention/redaction policy.
</details>

<details><summary>Thinking/DoD</summary>

Junior log string; Middle structured audit + permission; Senior tamper resistance, legal/privacy, schema evolution, appeal workflow và operator tooling. Test business transaction rollback thì audit tương ứng cũng không được “thành công giả”.
</details>

### [COM-11] Membership cache invalidation không gây lộ quyền

**L4 · SEC/DST/PRF · authorization cache, versioned key, TTL, revocation · 4 hướng · Redis + chat/feed**

**Bối cảnh:** cache membership giúp chat/feed nhanh nhưng ban user phải có hiệu lực sớm. **Invariant:** stale allow nguy hiểm hơn stale deny; DB là source of truth.

**Task:** đặt security freshness SLO, key schema và behavior Redis/event failure.

<details><summary>4 cách</summary>

A không cache authz; baseline đúng. B TTL ngắn per user/community. C event invalidation sau commit + TTL safety net. D version membership trên community/user, capability key mang version. Write-through không loại được mọi race/network partition. Với mutation nhạy cảm có thể recheck DB dù content reads dùng cache.
</details>

<details><summary>Senior questions/test</summary>

Junior cache bool; Middle key/TTL/invalidate; Senior stale-allow threat, multi-instance, event loss, fail-open/closed và cardinality budget. Chaos: drop invalidation rồi ban user; hệ thống phải đạt documented revocation bound và metric cache staleness/recheck.
</details>

### [COM-12] Xóa/đóng community như một workflow

**L5 · DST/DAT · saga, tombstone, retention, batch cleanup · 4 hướng · MySQL/Cassandra/Elastic/MinIO/Kafka**

**Bối cảnh:** community liên quan post/media/chat/search/report. Hard-delete cascade không đủ cho nhiều store. **Invariant:** không còn truy cập sau close; cleanup retry được; audit/retention đúng policy.

**Task:** state machine `Active→Closing→Closed→Purging→Purged`, job orchestration và reconciliation.

<details><summary>Phân rã và các cách</summary>

Tách access revocation (nhanh) khỏi physical purge (chậm). A synchronous best-effort — dễ timeout. B orchestrated saga/job table với từng step idempotent. C Kafka choreography — decouple nhưng khó nhìn toàn trạng thái. D soft-delete vô thời hạn — vận hành dễ nhưng retention/cost. Ghi progress/error per store, retry budget và manual resume.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior cascade DB; Middle background cleanup; Senior legal hold, late events, rollback trước purge, data ownership và operator runbook. Kill process ở mỗi step, resume không leak access hoặc xóa nhầm community khác.
</details>
