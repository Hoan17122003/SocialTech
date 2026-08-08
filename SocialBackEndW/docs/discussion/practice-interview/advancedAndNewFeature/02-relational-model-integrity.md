# Relational Model & Integrity: Feature Schema mới

Mỗi task bắt đầu bằng MySQL/EF Core baseline. Chỉ đổi sang document/graph/event model nếu query/invariant chứng minh cần.

### [REL-01] Remodel community ownership

**L3→L4 · Aggregate/RBAC · owner FK, membership role, history · 3 hướng**

**Problem:** `CreatedByUserId` và membership Role=Owner có thể drift. **Invariant:** đúng một active owner hoặc rule multi-owner explicit; transfer atomic.

<details><summary>3 models</summary>

A `Community.OwnerUserId` FK là current truth, memberships only roles. B owner as membership + serialized/locked transfer. C OwnershipHistory + current pointer. A makes unique current invariant simplest; C adds audit. Creator is historical fact, not necessarily current owner—rename fields accordingly.
</details>

<details><summary>Levels/DoD</summary>

Junior sync two fields; Middle transaction/CAS; Senior remodel to express invariant, migrate drift and preserve history. Race two transfers/leaves.
</details>

### [REL-02] Membership lifecycle/history

**L3 · Workflow/Temporal · state transition, effective period · 3 hướng**

**Feature:** join approval, leave, rejoin, ban, temporary suspension. **Invariant:** current state unique; every privileged transition auditable.

<details><summary>3 designs</summary>

A mutable membership row + audit table. B temporal versions `(ValidFrom,ValidTo)`. C append membership events + current projection. A easiest/current MySQL; B supports as-of query; C event-heavy. Add reason/actor/version/ban expiry and current unique `(Community,User)`.
</details>

<details><summary>Thinking/test</summary>

Junior enum; Middle transition matrix/index; Senior historical authorization, retention/rebuild and late command. Property tests transitions.
</details>

### [REL-03] Community invite/quota schema

**L3 · Security/Concurrency · hashed token, atomic redeem, quota · 3 hướng**

**Feature:** single/multi-use invite for private communities. **Invariant:** secret stored hashed; expiry/quota/ban enforced; redeem idempotent.

<details><summary>3 options</summary>

A CommunityInvites row with conditional `UsedCount<MaxUses`. B one InviteRedemption row per user + invite. C signed JWT plus revocation/quota DB. Transaction reserve/redeem + membership; unique redemption. Separate display code from token hash.
</details>

<details><summary>Levels</summary>

Junior token expiry; Middle conditional update/unique; Senior crash/retry, abuse, audit and cleanup. 100 concurrent redeems at quota 10.
</details>

### [REL-04] Unified user relationship state

**L3→L4 · Social/privacy · follow request, block, mute · 4 hướng**

**Feature:** private follow approval, block, mute and close-friends. **Invariant:** block overrides follow/recommendation/chat visibility.

<details><summary>4 schemas</summary>

A extend UserFollow status. B separate FollowRequests, Blocks, Mutes. C unified directed UserRelationship with type/state. D event/history plus current projection. Separate tables give strong semantics/simple indexes; unified eases policy but many nullable fields. Define direction and pair normalization.
</details>

<details><summary>Thinking/DoD</summary>

Junior booleans; Middle state/unique/auth matrix; Senior privacy across feed/search/graph/cache and transition audit. Test accept-vs-block race.
</details>

### [REL-05] UserSessions và token families

**L3→L4 · Auth data · hashed refresh, device session, reuse · 3 hướng**

**Problem/feature:** replace `IPLogin` with multi-device sessions. **Invariant:** DB leak not yield usable token; rotate/revoke/reuse atomic.

<details><summary>3 options</summary>

A DB UserSessions current-token hash/version. B Session + RefreshTokenHistory/family chain. C Redis active state + DB audit. Store sid, token hash/HMAC, expiry/revoked/reason/device label/last seen—not raw token. IP/user-agent retention/privacy explicit.
</details>

<details><summary>Levels</summary>

Junior add device; Middle CAS rotation/revoke; Senior grace window, family compromise and migration active sessions. Concurrent two-tab refresh test.
</details>

### [REL-06] Account state and security action history

**L3 · Security/Temporal · Active/Locked/Suspended/Deleted/Compromised · 3 hướng**

**Feature:** admin/security lifecycle beyond email verified. **Invariant:** every transition actor/reason/effective time; login policy deny-by-default.

<details><summary>3 models</summary>

A current enum + columns. B AccountStateHistory + current state. C security commands/event ledger + projection. Avoid independent booleans creating impossible combinations. Temporary suspension has Until; compromise revokes sessions transactionally/outbox.
</details>

<details><summary>Levels</summary>

Junior flags; Middle state machine/history; Senior temporal auth, appeal, operator audit and downstream tombstone. Test scheduled expiry and stale admin command.
</details>

### [REL-07] Post revision/edit history

**L3 · Content/Audit · version, snapshot/diff, optimistic edit · 3 hướng**

**Feature:** view edit history/restore; protect moderator removal. **Invariant:** current version monotonic; history immutable; restore creates new version.

<details><summary>3 designs</summary>

A Post current + PostRevisions snapshots. B store diffs (space efficient, replay complex). C event sourcing content aggregate. Snapshot is simplest for ≤10KB body. Add editor/reason/status/version and expected version API. Media/tag revisions need ownership policy.
</details>

<details><summary>Levels/DoD</summary>

Junior UpdatedAt; Middle version/history/restore; Senior storage/retention, moderation evidence and conflict merge. Concurrent author edit vs moderator remove.
</details>

### [REL-08] Post subtype constraints và link/media/poll

**L2→L3 · Relational inheritance · discriminator, subtype table · 3 hướng**

**Problem:** PostType includes semantics not expressed by columns. **Invariant:** Text/Link/Media/Poll has required payload and forbids invalid combinations.

<details><summary>3 schemas</summary>

A sparse Post columns + conditional CHECK. B TPT `LinkPosts/Polls/...`. C typed JSON payload with schema version. TPT strongest/query joins; JSON flexible but constraints harder. Keep shared author/community/status in Posts.
</details>

<details><summary>Levels</summary>

Junior add Url; Middle discriminator checks; Senior extension/migration/query shape and search projection. Raw invalid inserts must fail.
</details>

### [REL-09] Polls, options và one-vote invariant

**L3 · Feature/Concurrency · poll lifecycle, unique vote, result visibility · 3 hướng**

**Feature:** community polls with single/multi-select, close time and hidden results. **Invariant:** options belong poll; vote rules and deadline atomic.

<details><summary>3 approaches</summary>

A Poll/PollOption/PollVote/PollVoteChoice relational tables; strong. B JSON options + vote rows; option mutation dangerous. C event votes + projection for scale. Unique `(PollId,UserId,OptionId)` plus conditional max choices needs transaction/domain. Snapshot option text to history if edits allowed.
</details>

<details><summary>Thinking/test</summary>

Junior CRUD; Middle constraints/deadline/concurrent vote; Senior hot poll counters, privacy/results, reconciliation. Fake clock and close-vs-vote race.
</details>

### [REL-10] Generic reactions without polymorphic-FK trap

**L3 · Engagement · reaction types, target integrity · 4 hướng**

**Feature:** emoji reactions to post/comment/message. **Invariant:** one user/reaction/target; target authorization; no orphan.

<details><summary>4 models</summary>

A separate PostReactions/CommentReactions/MessageReactions. B common ContentItem identity table then FK. C TargetType/TargetId generic loses FK. D chat reactions in Cassandra, relational reactions in MySQL. Prefer separate/identity table unless targets truly share lifecycle.
</details>

<details><summary>Levels</summary>

Junior generic table; Middle FK/unique/access indexes; Senior cross-store target, counters and deletion/reconciliation. Toggle should use desired state/idempotency.
</details>

### [REL-11] Bookmark collections, not only saved post

**L2→L3 · Feature/Schema · collection, ordering, privacy · 3 hướng**

**Feature:** users group saved posts into private/public collections. **Invariant:** ownership, unique membership, inaccessible posts not leaked.

<details><summary>3 schemas</summary>

A Collections + CollectionItems with unique `(Collection,Post)`. B extend UserSavedPost with nullable CollectionId (poor multiple collections). C document collection snapshot for read-heavy. Add cursor by AddedAt/position, public slug, collaboration version if later.
</details>

<details><summary>Levels</summary>

Junior folder CRUD; Middle permission/keyset/unique; Senior stale visibility, collaborative edits, cache/search projection. Test post becomes private/removed.
</details>

### [REL-12] Tag aliases, hierarchy và merge

**L3 · Taxonomy · canonical tag, alias, graph/tree · 3 hướng**

**Feature:** synonyms, rename, parent topics. **Invariant:** canonical PostTag unique; old slug redirects; merge reversible/audited.

<details><summary>3 options</summary>

A TagAliases→CanonicalTag. B parent adjacency for small hierarchy. C graph/search synonym projection for richer relations. Merge in transaction moves PostTags with upsert then tombstones source. Cycles/duplicate aliases must be prevented.
</details>

<details><summary>Levels</summary>

Junior rename; Middle alias/merge constraints; Senior taxonomy governance, multilingual synonyms and search/recommendation propagation.
</details>

### [REL-13] Mentions và entity references

**L3 · Feature/Parsing · immutable reference, notification dedupe · 3 hướng**

**Feature:** @user/#community mentions in post/comment/chat. **Invariant:** parse result tied to content version; blocked/private actor rules; notification idempotent.

<details><summary>3 designs</summary>

A parse on write, store PostMentions/CommentMentions. B async extraction event/projection. C derive every read (poor). Store target PublicId/internal FK and source content version; edit computes add/remove delta. Chat may store mention IDs in Cassandra payload/search projection.
</details>

<details><summary>Levels</summary>

Junior regex; Middle parser+FK+dedupe; Senior rename ambiguity, privacy/block, out-of-order edit events and moderation. Test idempotent reprocess.
</details>

### [REL-14] Moderation action ledger và appeals

**L3→L4 · Audit/Workflow · append-only, evidence snapshot, appeal · 3 hướng**

**Feature:** transparent moderation across content/membership. **Invariant:** decisions immutable; current outcome derived/versioned; appeal doesn't silently undo.

<details><summary>3 models</summary>

A ModerationActions append table + mutable target status. B ReportDecision/Appeal normalized workflow. C event-sourced moderation context. Store actor, policy/rule version, before/after, reason, evidence refs. PII/evidence access/retention strict.
</details>

<details><summary>Levels</summary>

Junior log reason; Middle state/audit/permissions; Senior tamper resistance, legal retention, explainability and rebuild current projection.
</details>

### [REL-15] Reputation ledger thay vì mutable score

**L3→L4 · Accounting pattern · append-only delta, idempotency, projection · 3 hướng**

**Feature/problem:** `User.ReputationScore` has no source/update strategy. **Invariant:** each business event contributes once; total explainable/rebuildable.

<details><summary>3 options</summary>

A mutable atomic score. B ReputationTransactions ledger + cached total. C Kafka event projection. Ledger rows unique SourceEventId, reason/delta/policyVersion; corrections append reversing entry, never edit history. Projection can be MySQL/Redis.
</details>

<details><summary>Levels/DoD</summary>

Junior increment; Middle ledger/unique; Senior policy version, abuse/caps, reconciliation and replay. Sum ledger equals cached score.
</details>

### [REL-16] Structured notification + preferences

**L3 · Read model/Consent · type, actor/entity, channel matrix · 3 hướng**

**Feature:** localized deep-link notification, quiet hours and email/in-app controls. **Invariant:** security events mandatory; same event+recipient deduped.

<details><summary>3 schemas</summary>

A typed columns + JSON payload/version. B normalized per-type tables. C pre-render content + metadata. Preference rows `(User,EventType,Channel)` with defaults/consent history; quiet hours/timezone. Unique EventId+Recipient.
</details>

<details><summary>Levels</summary>

Junior message/url; Middle payload/dedupe/preferences; Senior version/localization, actor deletion/redaction, retention and delivery analytics.
</details>

### [REL-17] Unified MediaObject và logical usages

**L4 · Storage metadata · physical/logical split, state machine · 3 hướng**

**Feature:** reuse secure pipeline for avatar/post/comment/chat/community images. **Invariant:** one physical object metadata truth; every logical use authorized; GC only unreferenced.

<details><summary>3 models</summary>

A MediaObjects + typed link tables. B table-per-owner files. C generic MediaUsage with content identity supertype. MediaObject fields hash/size/MIME/state/scan/storageVersion; usages caption/order/owner. Reference count can derive or reconcile, not blindly mutate.
</details>

<details><summary>Levels</summary>

Junior one Attachments table; Middle normalize object/usage; Senior dedupe/privacy/encryption, derivative DAG and orphan sweeper. Migration both existing media models.
</details>

### [REL-18] API idempotency ledger

**L3 · Reliability · request fingerprint, result replay, expiry · 3 hướng**

**Feature/problem:** retry create user/post/upload/finalize after timeout. **Invariant:** same key+payload one logical effect; different payload conflict.

<details><summary>3 stores</summary>

A MySQL IdempotencyRequests in same transaction. B Redis TTL for noncritical short window. C natural business key only (cannot replay full response). Store key scope/user/route/request hash/status/result ref/expiry; handle InProgress takeover/timeout.
</details>

<details><summary>Levels</summary>

Junior catch duplicate; Middle ledger+fingerprint; Senior concurrency, response privacy/size, retention and multi-region ownership.
</details>

### [REL-19] Outbox/Inbox schemas as platform primitives

**L4 · Messaging · lease, partition key, retention · 3 hướng**

**Feature:** reliable events for all aggregates. **Invariant:** local commit atomic; relay/consumer duplicates safe.

<details><summary>3 implementations</summary>

A shared OutboxMessages/InboxMessages. B bounded-context tables. C Debezium outbox router. Fields ID, aggregate/type/version/key/payload/occurred/available/attempt/lease/error; indexes pending/available. Archive/partition to avoid table growth. Keep business transaction free of Kafka call.
</details>

<details><summary>Levels</summary>

Junior event table; Middle poll/claim/idempotency; Senior ordering/fairness, poison/cleanup, CDC and observability. Multi-worker lease/fencing tests.
</details>

### [REL-20] Feature flags và versioned product configuration

**L3 · Operations/Data model · scope, rollout, audit · 3 hướng**

**Feature:** enable feed ranking/chat media/moderation per environment/cohort. **Invariant:** deterministic evaluation, safe default, changes audited.

<details><summary>3 options</summary>

A app config for static flags. B MySQL FeatureFlags+Rules versioned, Redis cache. C managed flag service. Avoid building full rules engine prematurely. Store scope/user-percent seed/start/end/owner/reason/version; cache invalidation event and kill switch.
</details>

<details><summary>Levels</summary>

Junior boolean; Middle targeting/cache/audit; Senior control-plane availability, stale behavior, approval and cleanup debt.
</details>

### [REL-21] User interest/profile model for recommendation

**L3→L4 · Feature/Privacy · explicit vs inferred interest, weight · 3 hướng**

**Feature:** personalized feed/community recommendations. **Invariant:** block/private/NSFW filters override scores; user can reset inferred profile.

<details><summary>3 models</summary>

A explicit UserTagInterests. B inferred InteractionFeatures ledger/aggregates. C vector user profile in vector store. Start explicit+recent interactions in MySQL/OLAP; vector only with evaluation. Store source/confidence/decay/version and consent/retention.
</details>

<details><summary>Levels</summary>

Junior selected tags; Middle weighted/decayed features; Senior privacy, cold start, feedback loops, diversity and experiment evaluation.
</details>

### [REL-22] Temporal soft-delete/tombstone strategy

**L4 · Governance · DeletedAt, global filters, restore/purge · 4 hướng**

**Problem:** hard delete conflicts with discussions, moderation and external projections. **Invariant:** deleted inaccessible immediately; restore/purge policy deterministic; unique keys reusable only by policy.

<details><summary>4 strategies</summary>

A DeletedAt on core rows + EF filters. B status per aggregate. C archive tables. D temporal/history/event ledger. Global filters can hide rows from admin/reconciliation accidentally; explicit query APIs needed. Tombstone/version events invalidate caches/search and prevent late resurrection.
</details>

<details><summary>Senior DoD</summary>

Junior flag; Middle filtered unique/index/restore; Senior cross-store deletion versions, legal hold, backup retention and proof of purge. Chaos late create/update event after tombstone.
</details>
