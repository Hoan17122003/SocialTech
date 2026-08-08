# Source Audit: Maintenance, Bug Fix và Data Risk

Các task dưới đây xuất phát từ bằng chứng trong source hiện tại. Hãy ưu tiên nhóm P0/P1 trước feature mới. Không sửa migration production cũ một cách tùy tiện: thường cần migration bù và rehearsal trên bản sao dữ liệu.

### [MAINT-01] Khóa schema drift và pending migration trong CI

**L2 · Migration/EF · model snapshot, drift, `ValueComparer` · 3 hướng · diagnostic hiện báo pending model changes**

**Problem:** `dotnet ef migrations has-pending-model-changes --no-build` xác nhận model khác snapshot và cảnh báo `User.Roles` dùng converter nhưng thiếu comparer. **Invariant:** binary/model/migration/deployed schema phải biết rõ version và tương thích.

<details><summary>Phân rã + 3 hướng</summary>

Chụp diff model→snapshot; so `information_schema` trên DB đã deploy; phân loại intended/unintended. A EF pending-model gate trong CI. B dựng ephemeral MySQL rồi migrate empty và N-1. C schema diff độc lập/migration bundle preflight. Không chỉ tạo migration mới rồi tin là đúng; kiểm tra SQL và dữ liệu cũ.
</details>

<details><summary>Junior / Middle / Senior + DoD</summary>

Junior chạy command; Middle CI fresh+upgrade tests; Senior version contract, lock budget, mixed-version deployment và drift alert. DoD: pipeline fail khi model đổi mà thiếu migration; có fixture production-like và report SQL.
</details>

### [MAINT-02] Sửa migration PublicId có zero-GUID collision

**L3 · Migration/Data integrity · expand-backfill-constrain · 3 hướng · `20260512070551_UpdatePublicIdOfUser.cs`**

**Problem:** migration thêm cùng `Guid.Empty` NOT NULL cho mọi user rồi tạo unique index; DB có >1 row có thể fail. **Invariant:** mọi PublicId nonzero, unique, immutable.

<details><summary>3 cách migration bù/an toàn</summary>

A nullable column → batch UUID backfill → verify → NOT NULL+unique. B shadow column/generated values then swap. C UUIDv7/ULID application backfill nếu cần locality. Không sửa history đã chạy mà không biết môi trường; tạo compensating migration hoặc rebuild baseline theo release policy.
</details>

<details><summary>Thinking/test/rollout</summary>

Junior đổi default; Middle test DB có 10k users; Senior batches/checkpoint/replication lag, old app compatibility và rollback. Queries verify zero/null/duplicates trước constraint.
</details>

### [MAINT-03] Role migration không làm mất quyền

**L3 · Migration/Security · dual column, RBAC, backfill · 3 hướng · role migrations + `UserConfiguration`**

**Problem:** migration drop `Role` rồi add `Roles longtext NOT NULL`, không map dữ liệu. **Invariant:** không user mất/tăng Admin/Member ngoài mapping đã review.

<details><summary>3 hướng</summary>

A dual-column, SQL map int→JSON, dual-read/write, verify rồi drop. B normalized `UserRoles` join table. C native MySQL JSON + JSON_VALID/generated indexes. Join table tốt cho query/audit; JSON ít join nhưng change tracking/querying phức tạp.
</details>

<details><summary>Thinking/DoD</summary>

Junior add default; Middle data-preserving backfill; Senior authorization versioning, canary shadow reads, least privilege và emergency rollback. Diff role counts/users before-after must be exact.
</details>

### [MAINT-04] Repair schema drift attachment nullable/FK

**L3 · Migration/Integrity · snapshot vs deployed schema · 3 hướng · attachment migration/snapshot/config**

**Problem:** migration chỉ thêm nullable CommentId nhưng không đổi PostId từ NOT NULL; snapshot hiện nói PostId nullable. **Invariant:** deployed schema khớp intended model trước bật comment attachment.

<details><summary>Phân rã</summary>

Inspect `information_schema` ở empty-migrated và upgraded DB; reproduce insert comment attachment. A migration alter PostId nullable + constraints. B split tables. C unified MediaObject/link tables. Backfill/repair row sai trước adding XOR/FKs. CI phải test cả đường fresh và upgrade.
</details>

<details><summary>Levels/test</summary>

Junior xem entity; Middle compare DB/snapshot; Senior migration lineage, data repair dry-run, lock impact. Include rollback or forward-only rationale if old data cannot map back.
</details>

### [MAINT-05] Sửa comment attachment đang ghi vào PostId

**L2→L3 · Bug/Data repair · owner type, factory, reconciliation · 3 hướng · `ArticleAdapterPort.BuildAttachmentEntities`**

**Problem:** comment ID truyền vào helper luôn gán `PostId`; có thể FK fail hoặc gắn vào post trùng ID. **Invariant:** attachment của comment trỏ đúng CommentId và comment thuộc post đúng.

<details><summary>3 hướng code/model</summary>

A builders riêng post/comment. B discriminated owner value object/factory. C MediaObject + link tables. Viết detector tìm rows tạo trong comment flow (object prefix/audit/time correlation), report confidence trước repair; không update mù vì PostId có thể hợp lệ tình cờ.
</details>

<details><summary>Thinking/DoD</summary>

Junior đổi field; Middle regression integration test; Senior forensic repair, authorization/object-prefix consistency và rollback. Test postId==commentId collision explicitly.
</details>

### [MAINT-06] Attachment phải có đúng một owner

**L3 · Relational modeling · XOR CHECK, polymorphic association · 3 hướng · `Attachments`**

**Problem:** PostId/CommentId có thể cả null hoặc cả non-null. **Invariant:** exactly one logical owner; storage key unique; size nonnegative.

<details><summary>3 schema options</summary>

A nullable FKs + XOR check. B PostAttachments/CommentAttachments tách riêng, FK mạnh. C MediaObjects + typed link tables mở rộng avatar/chat/community. Generic OwnerType/OwnerId linh hoạt nhưng mất FK. Chọn theo số owner types và lifecycle chung.
</details>

<details><summary>Level thinking/test</summary>

Junior DTO validate; Middle DB CHECK/FK/index; Senior model physical object vs logical use, dedupe/retention/security. Test raw SQL bypass service.
</details>

### [MAINT-07] Thay user-delete trigger bằng lifecycle rõ ràng

**L4 · Data governance · cascade graph, anonymization, saga · 4 hướng · `AddDeleteUserTrigger`**

**Problem:** trigger chỉ xóa Posts; Comments/Reports/UserFollow/Community dùng Restrict và external stores không được xử lý. **Invariant:** delete/anonymize không orphan, không phá audit, retry được.

<details><summary>4 hướng</summary>

A FK cascade toàn graph—đơn giản nhưng dễ xóa quá mức. B soft delete/tombstone. C anonymize PII giữ content. D orchestrated deletion job qua MySQL/MinIO/Cassandra/Elastic/Kafka. Thường revoke access ngay, pseudonymize, rồi purge theo retention.
</details>

<details><summary>Senior work</summary>

Junior thêm deletes; Middle dependency map/transaction; Senior legal hold, late events, backup retention, proof of deletion và operator runbook. Kill workflow mỗi step then resume.
</details>

### [MAINT-08] Dẹp migration noise từ SystemStatus seed

**L1→L2 · Migration maintenance · deterministic seed · 3 hướng · `SystemStatusConfiguration`**

**Problem:** inherited `CreatedAtUtc=UtcNow` makes unrelated migrations emit UpdateData timestamp. **Invariant:** model snapshot deterministic.

<details><summary>Hướng</summary>

A set fixed CreatedAt in seed. B remove operational timestamp from HasData. C initialize runtime/reference data separately. Decide whether SystemStatus is reference row or live health data; database seed should not act as clock.
</details>

<details><summary>Levels/DoD</summary>

Junior fixed value; Middle regenerate/check clean migration; Senior separate schema/reference/operational ownership. Creating an empty migration twice yields no diff.
</details>

### [MAINT-09] Audit provider/package compatibility và vulnerability

**L3 · Maintenance/Supply chain · EF provider matrix, SBOM, advisory · 3 hướng · `.csproj`, MySQL 8 compose**

**Problem:** EF Core 8 packages coexist with `MySql.EntityFrameworkCore 10...`, SqlServer provider unused and local restore reports a MailKit advisory. **Invariant:** runtime/design-time provider supported; dependency risk reviewed/reproducible.

<details><summary>3 paths</summary>

A align all EF/provider versions compatible with net8/MySQL8. B evaluate Pomelo provider in a branch with SQL/migration comparison. C upgrade target framework/provider together later. Remove unused provider/client packages only after reference audit. Add locked restore/SBOM/vulnerability CI and documented exceptions.
</details>

<details><summary>Thinking/test</summary>

Junior update latest; Middle compatibility/integration suite; Senior generated SQL/locking/migration semantics, supply-chain policy and rollback. Do not blindly upgrade production data provider.
</details>

### [MAINT-10] Thêm foreign keys cho chat metadata

**L3 · Integrity/Retention · FK, orphan repair · 4 relationships · chat configs**

**Problem:** CreatedByUserId, CommunityId, direct-user IDs, last sender and participant UserId lack explicit FK/navigation constraints. **Invariant:** reference valid or deliberate tombstone/SetNull.

<details><summary>Phân rã</summary>

Inventory orphan rows first. Choose Restrict/SetNull/soft principal per relation: creator may tombstone; community conversation linked to community lifecycle; participants/direct users must exist at creation. Add indexes/FKs online after backfill. Cassandra historical sender snapshot may remain after user anonymization.
</details>

<details><summary>Levels/DoD</summary>

Junior add FK; Middle deletion behavior/migration; Senior retention across MySQL+Cassandra, anonymization and PII. Raw insert of orphan must fail or map to tombstone policy.
</details>

### [MAINT-11] Unique direct/community conversation

**L3 · Concurrency/Schema · canonical key, unique constraint · 3 hướng · `ChatConversationConfiguration`**

**Problem:** indexes pair/community are nonunique; concurrent get-or-create makes duplicates. **Invariant:** one direct conversation per unordered pair; one canonical community chat.

<details><summary>3 options</summary>

A unique `(Kind,LowId,HighId)` and `(Kind,CommunityId)` considering MySQL NULL semantics. B deterministic natural key columns. C subtype tables/functional generated key. Migrate existing duplicates by choosing canonical, merging participants/metadata and mapping messages before constraint.
</details>

<details><summary>Thinking/test</summary>

Junior query first; Middle insert/catch/reload; Senior duplicate migration and cross-store reference cutover. 100 concurrent creates yield one row.
</details>

### [MAINT-12] CHECK constraints theo ChatConversationKind

**L3 · Relational sum type · discriminator invariant · 3 hướng**

**Problem:** direct can lack users, community can lack CommunityId, group can contain irrelevant IDs. **Invariant:** each Kind has exactly valid column shape.

<details><summary>Options</summary>

A conditional CHECK matrix. B TPT subtype tables. C single canonical `ConversationSubjectKey` plus participant model. CHECK keeps current schema; subtype tables stronger but migration/query joins. Also require low<high and direct has two active participants via service/repair because multi-row count hard in CHECK.
</details>

<details><summary>Levels</summary>

Junior enum in C#; Middle DB checks; Senior representation trade-off and migration corrupted rows. Property/integration tests all kind combinations.
</details>

### [MAINT-13] ContentReport target và community integrity

**L3→L4 · Security/Schema · XOR, composite FK, state constraint · 4 hướng · `ContentReport`**

**Problem:** report can target neither/both; CommunityId may not match target; ReviewedAt inconsistent. **Invariant:** one visible target in same community and valid state/reviewer/time.

<details><summary>4 schema choices</summary>

A XOR check + service cross-community validation. B composite FK via unique `(Id,CommunityId)` on target. C separate PostReports/CommentReports. D generic target loses FK. Add transition/history ledger rather than only mutable final row if appeals/audit matter.
</details>

<details><summary>Thinking/test</summary>

Junior required fields; Middle DB constraints/transactions; Senior security boundary, moderator queue/appeal and evidence retention. Fuzz raw inserts and target moves/deletes.
</details>

### [MAINT-14] Comment parent phải cùng post; Depth không spoof được

**L3 · Tree modeling · composite FK, recursive data · 4 hướng · comments**

**Problem:** ParentCommentId only references ID; cross-post parent and wrong/negative Depth possible. **Invariant:** same PostId, acyclic, server-derived depth within max.

<details><summary>4 options</summary>

A service transaction + checks. B unique `(Id,PostId)` and composite parent FK `(ParentId,PostId)`. C materialized path. D closure table. Composite FK handles same post; cycle/depth needs domain/trigger/reconciliation. Choose read pattern before advanced tree schema.
</details>

<details><summary>Levels/DoD</summary>

Junior parent lookup; Middle composite FK/max depth; Senior subtree pagination/moderation/purge. Test cross-post, concurrent delete/reply and malformed existing tree repair.
</details>

### [MAINT-15] Enum/numeric DB constraints

**L2 · Integrity · CHECK, lookup table, valid range · 3 hướng · votes/status/visibility/counters**

**Problem:** converted ints accept invalid enum values; counters/FileSize/Depth can be negative. **Invariant:** only declared state/value ranges persist.

<details><summary>3 options</summary>

A CHECK IN/range. B lookup/reference tables with FK. C native enum where provider supports (coupled migration). Check best for stable small enum; lookup better metadata/evolution. Separate counters (nonnegative) from scores/reputation that may legitimately be negative.
</details>

<details><summary>Thinking/test</summary>

Junior C# enum; Middle DB defense; Senior evolution/backward compatibility and repair before constraint. Raw SQL invalid fixture must fail.
</details>

### [MAINT-16] Sửa Roles JSON change tracking/queryability

**L3 · EF/Data modeling · `ValueComparer`, JSON_VALID, RBAC · 3 hướng · `User.Roles`**

**Problem:** EF warns no ValueComparer; longtext can contain invalid JSON and is hard to query/index. **Invariant:** changes detected and only valid roles stored/audited.

<details><summary>3 options</summary>

A add deep-copy/equality ValueComparer + JSON check. B MySQL native JSON with generated indexed paths. C normalized UserRoles table (recommended when querying/auditing). Claims/external IdP another boundary but still needs local capability mapping.
</details>

<details><summary>Levels/DoD</summary>

Junior replace array; Middle comparer/validation; Senior RBAC→capabilities, audit and data-preserving migration. Test in-place mutation and concurrent role change.
</details>

### [MAINT-17] Normalized email/username/slug

**L3 · Identity/Collation · Unicode normalization, generated column · 4 hướng**

**Problem:** unique behavior depends on collation/trailing spaces and trim usage. **Invariant:** canonical identity unique across all write paths.

<details><summary>4 options</summary>

A persisted NormalizedEmail/Username/Slug. B generated lower/trim columns. C deliberate case-insensitive collation. D PostgreSQL citext POC. Define Unicode normalization and email local-part policy before code; backfill must report collisions for manual resolution.
</details>

<details><summary>Thinking/test</summary>

Junior ToLower; Middle normalized unique index; Senior canonical policy, upgrade collisions, account enumeration and dual read/write rollout.
</details>

### [MAINT-18] Bound profile và repository collections

**L2→L3 · Query/API · projection, hard cap · 3 hướng · profile/posts/members/notifications**

**Problem:** profile projects all authored posts; multiple repositories return unbounded lists and may expose draft/private content. **Invariant:** response bounded and authorization-filtered.

<details><summary>3 options</summary>

A hard top-N preview + separate cursor endpoint. B dedicated read models. C GraphQL connection/DataLoader if product requires flexible selection. Apply status/community visibility inside DB query; never load all then filter. Cap request limit globally.
</details>

<details><summary>Levels/DoD</summary>

Junior `Take(10)`; Middle projection/filter/cursor; Senior access-pattern read models and response/DB budget. Seed 100k posts/notifications and measure allocation/SQL.
</details>

### [MAINT-19] Replace offset pagination ở hot paths

**L3 · Query performance · seek cursor, stable order · 3 hướng · post/comment/follower/inbox**

**Problem:** Skip/Take degrades deep pages and shifts with new rows. **Invariant:** deterministic no skip/duplicate under insert.

<details><summary>3 options</summary>

A composite `(CreatedAtUtc,Id)` keyset. B opaque signed cursor. C snapshot/PIT for search/export. Offset remains acceptable for small admin pages. Index must match filter+sort and tie-breaker.
</details>

<details><summary>Thinking/test</summary>

Junior page number; Middle tuple predicate; Senior live-vs-snapshot semantics, cursor version and filter binding. Property test concatenated pages under inserts.
</details>

### [MAINT-20] Sửa mutual-follow search non-sargable

**L3 · SQL/Search · normalization, full-text, projection · 3 hướng · `UserFollowRepository`**

**Problem:** `ToLower().Contains` likely prevents B-tree and query has correlated mutual checks. **Invariant:** mutual/privacy filters correct with bounded latency.

<details><summary>3 paths</summary>

A normalized prefix column/index. B MySQL FULLTEXT/ngram. C Elasticsearch user index after evidence. Rewrite relationship query set-based/joins and inspect generated SQL. Elasticsearch adds eventual sync/deletion/privacy work; not default fix for small data.
</details>

<details><summary>Levels/DoD</summary>

Junior Contains; Middle sargable/index plan; Senior query corpus/relevance, scale threshold and projection repair. `EXPLAIN` before/after required.
</details>

### [MAINT-21] Sửa Post-created projection null/translation bugs

**L2→L3 · EF query correctness · client evaluation boundary, nullable · 3 hướng · `PostRepository`**

**Problem:** `post.Body.Split(...)` on nullable Body inside IQueryable may fail translation/NRE; profile link appears based on postId. **Invariant:** event projection always builds deterministically without leaking/wrong links.

<details><summary>3 options</summary>

A select raw bounded fields then build excerpt in app. B persisted Excerpt generated on write. C search/read projection store. Fix identity/link contract using author PublicId, and bound follower payload rather than materialize huge lists inside one event.
</details>

<details><summary>Thinking/test</summary>

Junior null-coalesce; Middle inspect SQL/provider translation; Senior reshape event (fan-out job, no giant payload), version and load. Test body null and high-follower author.
</details>

### [MAINT-22] Loại sync-over-async trong repository/storage/auth

**L2→L3 · Async/DB · `.Result`, starvation, cancellation · 3 hướng · comment delete, MinIO, JWT event**

**Problem:** synchronous waits on async I/O can starve threads; several SaveChanges ignore caller token. **Invariant:** async end-to-end and cancellation reaches provider.

<details><summary>3 fixes</summary>

A async signatures/calls throughout. B redesign mapping that currently needs remote URL. C background/read model to remove remote call from hot path. Do not wrap I/O in Task.Run. Use `await FindAsync/SaveChangesAsync`, pass token and map cancellation correctly.
</details>

<details><summary>Levels/DoD</summary>

Junior replace Result; Middle propagate interfaces/token; Senior point-of-no-return and dependency-on-hot-path. Load test delayed DB/Redis/MinIO and ThreadPool counters.
</details>

### [MAINT-23] Redis Set/TTL/Clear phải atomic và nonblocking

**L3 · Redis/Concurrency · SET, Lua, SCAN, versioned namespace · 4 hướng · `CacheAdapter`**

**Problem:** sync get→remove→set creates race/round trips; login INCR/expiry split; prefix clear enumerates keys. **Invariant:** value+TTL atomic; no request-path global scan.

<details><summary>4 options</summary>

A direct async SET with expiry. B NX/XX/CAS Lua when semantic requires. C atomic Lua INCR+EXPIRE. D invalidate via exact keys/version bump; SCAN+UNLINK only admin background. Secure/remove raw CacheController endpoints.
</details>

<details><summary>Thinking/test</summary>

Junior remove extra get; Middle choose atomic semantics; Senior cluster topology, Redis-down policy, key/TTL catalog and million-key p99. Concurrent tests and command count evidence.
</details>

### [MAINT-24] Notification schema/query không còn “message-only + load-all”

**L2→L3 · Schema/Read model · type, payload, dedupe, cursor · 4 hướng · notifications**

**Problem:** only Message/IsRead; repository loads every row; no event identity/deep link/preferences. **Invariant:** same event+recipient one notification; old notification remains renderable.

<details><summary>4 options</summary>

A add Type/Actor/Entity/DeepLink/DedupeKey. B versioned JSON payload. C normalized typed tables. D pre-render text plus structured metadata. Add cursor/index/retention and read counter strategy. Localization and deleted actor redaction must be deliberate.
</details>

<details><summary>Levels/DoD</summary>

Junior add URL/page; Middle typed payload+unique dedupe; Senior contract version, preferences, archive and analytics. Test duplicate Kafka delivery and 100k rows/user.
</details>

### [MAINT-25] Kafka poison event, unknown event và retry semantics

**L3→L4 · Messaging · EventId, inbox, retry topic, DLQ · 4 hướng · consumer/envelope**

**Problem:** envelope lacks ID/version; exception before commit can loop forever; unknown type currently may be committed/lost by policy accident. **Invariant:** bounded retries, observable DLQ, replay safe.

<details><summary>4 components</summary>

Envelope v2 EventId/version/correlation; inbox unique; transient retry tiers; permanent/unsupported DLQ. Publish handoff to retry/DLQ before commit original. Decide unknown future version quarantine vs ignore. Split slow email/domain workloads.
</details>

<details><summary>Thinking/test</summary>

Junior catch/log; Middle error taxonomy/attempt; Senior ordering, PII, replay tooling and schema governance. Inject malformed JSON, unsupported version, SMTP timeout and broker outage during retry handoff.
</details>

### [MAINT-26] Đóng dual-write gap bằng outbox/inbox

**L4 · Distributed consistency · outbox, CDC, idempotency · 3 hướng · user/article/notification**

**Problem:** MySQL commit and Kafka publish separate; consumer DB effect and offset separate. **Invariant:** committed business change eventually emits event; duplicates safe.

<details><summary>3 approaches</summary>

A EF transactional outbox poller. B Debezium outbox CDC. C synchronous publish+reconciliation (weaker). Consumer DB effect + inbox same local transaction. SMTP cannot be atomic—use intent/delivery ledger and honest at-least-once semantics.
</details>

<details><summary>Senior DoD</summary>

Crash at every boundary, measure oldest outbox/lag, cleanup/retention, partition key/order. Explain why Kafka producer idempotence alone does not solve MySQL dual write.
</details>

### [MAINT-27] Fix ChatMessage rehydration và Elasticsearch index drift

**L3 · Data mapping/Search · identity, explicit mapping, alias · 3 hướng · Cassandra/Elastic**

**Problem:** read paths call Create and can generate new IDs/times; search hardcodes one index while DI config differs; index existence/create occurs on request. **Invariant:** identity/state exact; deployment owns schema.

<details><summary>3 fixes</summary>

A Rehydrate factory/persistence DTO. B explicit mapper and contract tests. C separate search DTO not domain aggregate. Move index template/create to deployment/startup migrator; use versioned index+alias and explicit mappings; add edit/delete versions.
</details>

<details><summary>Thinking/test</summary>

Junior setters/AutoMap; Middle round-trip/explicit index; Senior projection version, zero-downtime reindex/reconcile. Golden rows/hits preserve IDs exactly.
</details>

### [MAINT-28] Cassandra partition/cursor/resilience maintenance

**L4 · NoSQL modeling · time bucket, composite cursor, prepared statement · 4 hướng · chat store/session**

**Problem:** whole conversation unbounded partition; cursor only time despite `(time,id)` order; prepare/resilience unclear. **Invariant:** partition bounded and pagination exact.

<details><summary>4 work items</summary>

Composite cursor or driver paging state; time/count buckets; prepared statement cache; declared consistency/retry/timeout. Consider Scylla only after same data-model proof—switching engines does not fix bad partition key. Plan dual write/backfill/read cutover.
</details>

<details><summary>Senior DoD</summary>

Estimate row/partition/hot community; test timestamp ties, node outage, tombstones and repair. Document RF/CL/RPO and bucket query fan-out.
</details>

### [MAINT-29] MinIO memory amplification và media IDOR

**L3→L4 · Storage/Security · streaming, Range, object authorization · 4 hướng · adapter/controller**

**Problem:** nonseek upload/download buffer full file; catch-all endpoints lack resource authorization. **Invariant:** GB object keeps bounded RAM; only authorized viewer reads.

<details><summary>4 changes</summary>

Streaming copy callback/port; direct presigned upload/download after auth; Range support; MediaAsset lookup/capability instead of arbitrary key. Add verified MIME/checksum/state/quota and avoid sync presign calls. Use staging/compensation/orphan reconciliation.
</details>

<details><summary>Thinking/test</summary>

Junior Authorize/MemoryStream; Middle object-level auth/stream/cancel; Senior CDN/presign revocation, egress, malware and lifecycle. Test 2GB, abort, forged key/private community.
</details>

### [MAINT-30] Docker/data durability và restore readiness

**L3→L5 · Operations · volume, health, RF, backup/restore · 4 stores · compose/config**

**Problem:** single MySQL/Redis/Kafka; Kafka RF1; Cassandra `latest`; Elasticsearch node volumes/network/health need audit; no restore automation visible. **Invariant:** dev topology explicit; production RPO/RTO not implied by volume existence.

<details><summary>Phân rã</summary>

Pin images; networks/healthchecks/readiness; durable volumes all intended nodes; separate secrets; backup MySQL+binlog, Cassandra snapshots/repair, ES snapshots, MinIO replication/versioning, Kafka retention/DR. A local compose remains single-node; B production-like test stack; C managed services.
</details>

<details><summary>Senior DoD</summary>

Define RPO/RTO per data class, automate encrypted backups/checksums and quarterly restore drill. Chaos node/disk loss, verify business invariants after restore—not merely service starts.
</details>
