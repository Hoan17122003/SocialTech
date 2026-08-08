# Query, Index, Pagination và Read Performance

Rule: query contract trước index; `EXPLAIN` trước/sau; dữ liệu phải skew giống social app (celebrity/hot community), không chỉ uniform.

### [QRY-01] Lập workload/query catalog

**L2 · Performance design · query shape, cardinality, SLO · 3 nguồn evidence**

**Task:** catalog every repository/API query: predicates, sort, page, selected columns, calls/request, expected rows/RPS/p95.

<details><summary>3 sources</summary>

A static repository scan. B EF command interceptor/APM. C MySQL slow/general query sampling. Static finds intent; runtime finds real distribution. Map query ID→endpoint→index→owner; classify OLTP point, feed range, search, batch/analytics.
</details>

<details><summary>Levels/DoD</summary>

Junior list SQL; Middle calls/plan/SLO; Senior workload growth/skew and query budget governance. Produce top-10 risk matrix, not index changes yet.
</details>

### [QRY-02] Feed composite indexes

**L3 · MySQL/EF · leftmost prefix, covering, seek · 4 queries · Posts**

**Problem:** current community/author indexes lack Status/PublishedAt/Id. **Invariant:** visible Published filter and deterministic cursor.

<details><summary>Candidate designs</summary>

Global `(Status,PublishedAtUtc,Id)`; community `(CommunityId,Status,PublishedAtUtc,Id)`; author `(AuthorId,Status,PublishedAtUtc,Id)`. Covering selected fields may make index huge; attachments/authors still separate. Validate NULL PublishedAt and sort direction/provider behavior.
</details>

<details><summary>Thinking/test</summary>

Junior one index/column; Middle composite plan/rows; Senior selectivity/write amplification/cache footprint. Benchmark 1m posts with hot community and deep cursor.
</details>

### [QRY-03] Root comment + replies access paths

**L3 · Tree query · composite index, recursive CTE · 3 contracts**

**Problem:** separate `(PostId,Created)` and `(ParentId,Created)` may not optimize root predicate+stable cursor. **Invariant:** bounded roots/replies without N+1.

<details><summary>3 API/query contracts</summary>

A page roots `(PostId,ParentId=NULL,Created,Id)` then batch preview replies. B flattened comment stream. C recursive CTE/subtree endpoint. Candidate root index `(PostId,ParentCommentId,CreatedAtUtc,Id)`; direct replies `(ParentCommentId,CreatedAtUtc,Id)`. Choose UX before schema.
</details>

<details><summary>Levels</summary>

Junior Include/recursion; Middle two bounded queries/cursors; Senior payload contract, hot post cache and tree model threshold. Assert max query count.
</details>

### [QRY-04] Membership authorization/inbox indexes

**L3 · Security hot path · covering index, bidirectional access · 3 queries**

**Problem:** unique `(CommunityId,UserId)` good for community→user; inbox/joined communities starts UserId+Status. **Invariant:** auth checks and inbox do not scan.

<details><summary>Index set</summary>

Keep unique. Add `(UserId,Status,CommunityId)` for memberships by user; `(CommunityId,Status,CreatedAtUtc,Id)` for member list. Avoid redundant prefix indexes without plan evidence. Consider compact authorization projection/cache only after DB baseline.
</details>

<details><summary>Levels/DoD</summary>

Junior index UserId; Middle predicate order/cover; Senior write cost, permission-cache staleness and SLO. Explain plans for both directions.
</details>

### [QRY-05] Chat participant/inbox indexes

**L3 · Chat metadata · leftmost prefix, keyset · 3 hướng**

**Problem:** unique starts ConversationId; inbox starts UserId/LeftAt. **Invariant:** active participant lookup and inbox stable/fast.

<details><summary>Options</summary>

A add `(UserId,LeftAtUtc,ConversationId)`. B denormalized UserConversationInbox read model ordered by LastMessage. C Redis sorted-set cache with MySQL truth. A likely sufficient initially; B needed at high fan-out/activity. Keyset inbox `(LastMessageAtUtc,Id)` handles null/empty ordering.
</details>

<details><summary>Thinking</summary>

Junior add index; Middle query plan/cursor; Senior update amplification/stale inbox/reconciliation. Load skew active vs left rows.
</details>

### [QRY-06] Notification unread/pagination index

**L2→L3 · Read model · keyset, low-cardinality predicate · 3 hướng**

**Problem:** current `(Recipient,Created)` lacks Id tie and unread filter; get-all. **Invariant:** exact list/cursor and idempotent mark-read.

<details><summary>Options</summary>

A `(RecipientUserId,IsRead,CreatedAtUtc,Id)`. B separate UnreadNotifications/read archive. C Redis unread counter+DB list. Low-cardinality IsRead works after high-selectivity recipient. Retention/partition may later remove old read rows.
</details>

<details><summary>DoD</summary>

Junior Take; Middle keyset/plan; Senior counter drift/archive. Test timestamp ties/100k per user and concurrent marks.
</details>

### [QRY-07] Saved-post listing index và collections

**L2 · Access path · unique write vs ordered read · 3 hướng**

**Problem:** `(UserId,PostId)` enforces duplicate but not sort SavedAt. **Invariant:** save idempotent; list respects current visibility.

<details><summary>Options</summary>

Add `(UserId,SavedAtUtc,Id)`; use keyset. If collections feature, `(CollectionId,AddedAt,Id)`. Redis sorted set only cache for hot saved list. Join/filter current post status/community permission in query or capability read model.
</details>

<details><summary>Levels</summary>

Junior reuse unique index; Middle second index/cursor; Senior stale auth/cache, index budget and archive. Test removed/private saved post.
</details>

### [QRY-08] Moderation claim queue indexes

**L3→L4 · Work queue · `SKIP LOCKED`, lease, covering · 3 hướng**

**Feature:** moderator pulls pending/expired claims. **Invariant:** one claim, fair order, stale lease reclaim.

<details><summary>3 query designs</summary>

A conditional UPDATE by selected ID. B `FOR UPDATE SKIP LOCKED` transaction. C Kafka/work queue. Index `(CommunityId,Status,LeaseUntil,CreatedAtUtc,Id)` or assigned variant from actual query. Store claim version/fencing.
</details>

<details><summary>Thinking/test</summary>

Junior first pending; Middle affected row/lock; Senior fairness/starvation/lease recovery and queue metrics. 20 workers claim unique reports.
</details>

### [QRY-09] Community rules/order index

**L2 · Scoped ordering · active filter, uniqueness · 3 hướng**

**Problem:** query CommunityId+IsActive order DisplayOrder; no index/uniqueness. **Invariant:** deterministic rules and reorder conflict visible.

<details><summary>Options</summary>

Index `(CommunityId,IsActive,DisplayOrder,Id)`; optional unique scoped order. Gap/fractional ordering changes write pattern. Cache public rule snapshot after DB baseline; invalidate version on moderation edits.
</details>

<details><summary>Levels</summary>

Junior OrderBy; Middle index/reorder transaction; Senior cache/version/audit and index selectivity. Concurrent reorder test.
</details>

### [QRY-10] Bounded profile projection

**L2→L3 · EF projection · top-N, split endpoint, authorization · 3 hướng**

**Problem:** profile builds all authored posts and attachments; may leak drafts/private. **Invariant:** bounded public preview, exact counts semantics.

<details><summary>3 designs</summary>

A profile scalar+counts and separate posts endpoint. B top 5 projection with filtered status; attachments preview only first. C precomputed ProfileSummary read model. Avoid giant nested collections; inspect generated SQL/cartesian. Private profile capability before sensitive query.
</details>

<details><summary>DoD</summary>

Junior `Take`; Middle split/projection/filter; Senior read-model/cache staleness and response budget. 100k authored posts no allocation explosion.
</details>

### [QRY-11] Cursor codec dùng chung nhưng query domain-specific

**L3 · API/Data · signed cursor, version, filter hash · 3 hướng**

**Task:** build common encode/sign/validate while each domain owns sort predicate/index.

<details><summary>3 options</summary>

A transparent cursor fields. B base64 JSON+HMAC `{v,sort,id,filterHash}`. C server-stored cursor. Bind to user/filter for sensitive lists; version and expiry. Cursor is not database paging magic: query must implement tuple seek correctly.
</details>

<details><summary>Levels</summary>

Junior encode; Middle tamper/version/property tests; Senior compatibility, privacy, snapshot semantics and key rotation.
</details>

### [QRY-12] Counter read strategy matrix

**L3→L4 · Aggregation · count-on-read, materialized, approximate · 4 counters**

**Task:** choose separately for member/post/view/comment/reputation; one pattern does not fit all.

<details><summary>Strategy matrix</summary>

Exact low-write member/post: transaction delta or count. High-write view: Redis/event approximate. Vote score: transaction with vote row or projection. Reputation: ledger+cached total. Every materialized counter needs idempotent delta/source truth/reconciliation.
</details>

<details><summary>Senior output</summary>

Junior property++; Middle atomic update; Senior accuracy/SLO/contention/durability and repair. Random command simulation compares truth and projection.
</details>

### [QRY-13] N+1/query budget tests

**L2→L3 · EF performance · interceptor, projection, batch load · 3 hướng**

**Task:** set max DB commands/endpoint for feed, inbox, comments, candidate search and notification.

<details><summary>3 fixes</summary>

A direct DTO projection. B Include/SplitQuery where graph truly needed. C batch-load IDs into dictionaries/DataLoader. Presigned URLs are remote N+1 too; cache/batch/direct stable media IDs. Never parallelize one DbContext.
</details>

<details><summary>DoD</summary>

Junior notice log; Middle interceptor assertion; Senior query budget in performance CI and API shape redesign. Page size increase must not linearly increase round trips.
</details>

### [QRY-14] Compiled query/read-model POC

**L3 · EF CPU overhead · compiled query, tracking · 3 hướng**

**Problem:** hot simple auth/feed summary queries may pay repeated expression compilation, but DB usually dominates. **Task:** benchmark before adopting.

<details><summary>3 options</summary>

A normal EF query baseline. B `EF.CompileAsyncQuery` for stable hot shape. C Dapper/raw SQL for a measured read hotspot. Compiled queries complicate dynamic filters; Dapper doesn't fix bad SQL/index. Use AsNoTracking/projection first.
</details>

<details><summary>Senior gate</summary>

Junior assumes raw SQL faster; Middle BenchmarkDotNet/trace; Senior complexity threshold and correctness/observability. Adopt only material CPU/latency win.
</details>

### [QRY-15] Live vs snapshot pagination

**L4 · Consistency/API · high-water mark, PIT, export · 3 contexts**

**Task:** define different semantics for feed (live), moderation queue (consistent claims), export/reindex (snapshot).

<details><summary>Options</summary>

Live keyset tolerates new items ahead. Snapshot uses `maxId/asOf` high-water or DB snapshot (long transaction risk). Elasticsearch PIT+search_after. Batch export stores checkpoint/high-water and applies changes after. State semantics in cursor contract.
</details>

<details><summary>Levels</summary>

Junior one pagination; Middle cursor; Senior per-use consistency, retention and transaction/replica implications.
</details>

### [QRY-16] MySQL FULLTEXT vs Elasticsearch search

**L3→L4 · Technology decision · relevance, consistency, ops · 3 hướng**

**Task:** compare post/user/community search on Vietnamese corpus and authorization filters.

<details><summary>3 candidates</summary>

A normalized prefix/B-tree for autocomplete. B MySQL FULLTEXT baseline. C Elasticsearch/OpenSearch for analyzers/fuzzy/facets. Measure precision/recall/p95/index lag/ops cost. MySQL truth; search projection rebuildable/versioned. Don't route transactional permission decisions through stale search.
</details>

<details><summary>Senior gate</summary>

Adopt ES only if feature/relevance/scale benefit exceeds sync/reindex burden. Provide POC kill/rebuild and stale-delete tests.
</details>

### [QRY-17] Read replica strategy

**L4 · Scale/Consistency · replica lag, read-your-writes · 3 hướng**

**Feature/problem:** feed/profile/reporting reads may pressure primary. **Invariant:** commands/auth/security read current enough; stale content bound documented.

<details><summary>3 routing models</summary>

A no replica until evidence. B separate read DbContext for feed/public. C session consistency token/stick-to-primary after write. Never route membership/authz/reset/session validation to lagging replica blindly. Measure lag and failover behavior.
</details>

<details><summary>Levels</summary>

Junior split connection; Middle classify queries; Senior consistency SLA, topology/failover/pool and stale cache interaction.
</details>

### [QRY-18] MySQL partition/archive growth plan

**L4 · Data lifecycle · range partition, archive table · 4 candidates**

**Candidates:** Notifications, Outbox/Inbox, audit/login events, view/engagement events—not Users/Posts by default.

<details><summary>Options</summary>

A batch delete. B archive table. C range partitions/month drop. D export Parquet then purge. MySQL unique/FK/partition constraints affect design; query must include partition key. Forecast rows/month/storage/index and legal retention first.
</details>

<details><summary>Senior DoD</summary>

Partition maintenance automation, restore query, late record policy and online migration rehearsal. Show why partitioning is management/scan aid, not universal speed button.
</details>

### [QRY-19] Connection pool/capacity budget

**L4 · Performance/Ops · Little’s Law, pool, timeout · MySQL/Redis/MinIO/ES**

**Task:** calculate in-flight per dependency from RPS×latency; ensure combined instances/workers do not exceed backend limits.

<details><summary>Model</summary>

Separate HTTP/background pools/bulkheads if supported; short transactions; bounded fan-out; command timeout not substitute for admission control. Pool size too high can overload DB; too low queues. Observe wait time/active/idle/timeouts and p99.
</details>

<details><summary>Levels</summary>

Junior raise pool; Middle measure saturation; Senior capacity across replicas/instances/deploy surge and load shedding. Dependency 10× latency chaos.
</details>

### [QRY-20] Slow-query regression gate

**L3→L4 · Observability · query fingerprint, plan regression · 3 hướng**

**Task:** dashboard and CI for top SQL by total time/p95/rows scanned; alert on regression without logging PII values.

<details><summary>3 implementations</summary>

A EF command metrics tagged normalized query ID. B MySQL slow query/performance_schema. C APM traces. Store plan snapshots for critical queries; production sampling and redaction. CI fixtures need realistic distributions/statistics.
</details>

<details><summary>Senior DoD</summary>

One intentional index removal/query change triggers gate/alert; runbook links query owner, index and rollback. Avoid high-cardinality raw SQL/parameter labels.
</details>
