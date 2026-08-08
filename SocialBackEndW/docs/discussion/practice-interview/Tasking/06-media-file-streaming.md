# Media, File I/O, Streaming và Batch

Baseline dùng MinIO runtime, có local adapter, proxy view/download và upload attachment tuần tự. Các task tập trung memory bounded, file security, cross-store consistency và large-file workflow.

### [MEDIA-01] Authorization media chống IDOR

**L2→L3 · SEC · object-level authorization, opaque ID, path normalization · 3 hướng · `MediaController`**

**Bối cảnh:** object key client gửi trực tiếp có thể bị đoán; `[Authorize]` đơn thuần chưa đủ. **Invariant:** viewer chỉ đọc media thuộc resource họ được phép xem; không path/oracle leak.

**Task:** đổi API từ arbitrary object key sang media id/signed grant và audit permission.

<details><summary>3 hướng</summary>

A lookup Attachment by id → load post/comment/community capability → stream. B backend cấp signed media grant chứa resource/user/expiry sau auth. C presigned MinIO URL chỉ sau authorization. Opaque key là defense-in-depth, không authorization. Normalize/decode một lần có policy; chống double-encoding/traversal và không tiết lộ object tồn tại qua khác biệt lỗi.
</details>

<details><summary>Thinking/test</summary>

Junior thêm Authorize; Middle object ownership/community visibility; Senior IDOR oracle, cached capability stale, signed URL leakage/revocation và CDN. Fuzz keys, `%2F/%252F`, media private/removed/banned.
</details>

### [MEDIA-02] Validate magic bytes, size và quota

**L3 · SEC/STR/CON · MIME sniffing, polyglot, atomic quota reservation · 4 hướng · upload services**

**Bối cảnh:** extension/content-type client không đáng tin. **Invariant:** type thật allow-listed, bytes/request/user bounded, quota race-safe.

**Task:** streaming prefix validation, size enforcement và quota model.

<details><summary>4 lớp bảo vệ</summary>

A extension allowlist (chỉ lớp ngoài). B magic signature/parser library; đọc prefix nhỏ rồi replay prefix+stream. C quarantine + antivirus. D async media decode/transcode để xác minh. Enforce server max stream bytes ngay cả chunked request. Quota dùng conditional reservation trước upload, finalize actual bytes, release on failure; count-after-upload có race.
</details>

<details><summary>Thinking/DoD</summary>

Junior extension/length; Middle magic/max bytes/quota transaction; Senior polyglot/decompression bomb, scanner isolation, per-tenant fairness và recovery reservation stale. Test forged extension, no Content-Length, concurrent last quota.
</details>

### [MEDIA-03] Stream download thay vì buffer cả object

**L3 · ASY/STR/PRF · response streaming, backpressure, cancellation · 3 hướng · `MinioFileStorageAdapter.DownloadAsync`**

**Bối cảnh:** copy object vào MemoryStream làm file 2 GB chiếm 2 GB RAM. **Invariant:** memory gần buffer size, disconnect dừng upstream, stream disposed đúng.

**Task:** redesign storage port và đo allocation/RAM dưới concurrent downloads.

<details><summary>3 hướng</summary>

A MinIO callback copy thẳng `Response.Body`; coupling HTTP nhưng ít buffer. B expose callback `CopyToAsync(Stream destination)` từ port; clean abstraction. C authorize rồi redirect/presigned URL, MinIO/CDN chịu egress. Trả producer stream bằng `Pipe` có backpressure nhưng lifecycle/error phức tạp. Cancellation lấy `RequestAborted` tới MinIO.
</details>

<details><summary>Thinking/test</summary>

Junior File(stream); Middle no buffering/disposal/cancel; Senior proxy-vs-direct security/cost, slow client, connection lifetime và bandwidth bulkhead. Test 20×2GB giả lập, memory bounded, abort early frees connections.
</details>

### [MEDIA-04] HTTP Range cho video

**L3→L4 · STR/PRF · 206, Content-Range, 416, seek · 3 hướng · media view**

**Bối cảnh:** browser cần seek video; buffered proxy không phù hợp. **Invariant:** byte range chính xác, invalid/multi-range policy rõ, auth vẫn áp dụng.

**Task:** implement single-range first, conditional headers and abuse tests.

<details><summary>3 hướng</summary>

A seekable stream + `enableRangeProcessing`; storage stream phải seek. B parse Range, call MinIO offset/length, set 206 headers. C presigned URL để MinIO/CDN xử lý. Add `HEAD`, length, ETag/If-Range; cap/merge range requests to avoid tiny-range amplification. Never read full object to serve small range.
</details>

<details><summary>Thinking/acceptance</summary>

Junior content type; Middle RFC semantics/test boundaries; Senior CDN/cache/auth trade-off, range abuse và egress observability. Browser seek integration + ranges 0-, suffix, beyond length, aborted client.
</details>

### [MEDIA-05] Upload nhiều file bounded và giữ thứ tự

**L3 · ASY/CON · bounded parallelism, partial completion, cancellation · 3 hướng · SavePostAttachments**

**Bối cảnh:** tuần tự chậm; unbounded WhenAll mở nhiều streams/sockets. **Invariant:** at most N uploads, result order match input, cancellation triggers compensation.

**Task:** benchmark sequential/WhenAll/bounded by file distribution.

<details><summary>3 cách</summary>

A sequential baseline. B `Task.WhenAll` only when max file count strictly small. C `Parallel.ForEachAsync`/semaphore N, retain input index. Fail-fast token may cancel pending but already completed still need cleanup. Aggregate per-file errors for UX or all-or-nothing—choose product semantic.
</details>

<details><summary>Thinking/test</summary>

Junior WhenAll; Middle limit/order/error/cleanup; Senior choose N by bandwidth/MinIO pool, adaptive by sizes, admission control and memory. Test one fail among 5, cancellation, 100 tiny vs 4 huge files.
</details>

### [MEDIA-06] Compensation cho partial upload

**L3→L4 · DST/DAT · saga, orphan, pending/finalize · 4 hướng · article/comment media**

**Bối cảnh:** file 3/5 hoặc DB attachment insert fail. **Invariant:** public DB không trỏ missing object; orphan eventually cleaned; retry idempotent.

**Task:** failure matrix và state/cleanup design.

<details><summary>4 hướng</summary>

A track uploaded keys, delete reverse in catch; cleanup can fail. B staging prefix, DB commit metadata then promote/finalize. C DB `PendingUpload` rows first, worker finalizes. D client direct upload session + explicit finalize. All need orphan sweeper listing stale sessions/objects and comparing metadata. Object key unique per upload session prevents retry collision.
</details>

<details><summary>Thinking/DoD</summary>

Junior catch/delete; Middle state+idempotent cleanup; Senior authoritative commit, visibility gating, cleanup failure/metrics, retention and operator repair. Kill process at each boundary and show convergence.
</details>

### [MEDIA-07] Concurrent avatar update không xóa avatar mới

**L3 · CON/DST · stale write, version, compare-and-swap, compensation · 3 hướng · user update/media**

**Bối cảnh:** request A/B upload; A save/delete old chậm có thể xóa object B hoặc DB trỏ sai. **Invariant:** DB points latest successful version; cleanup never deletes referenced object.

**Task:** deterministic race test and safe replace protocol.

<details><summary>3 hướng</summary>

A upload unique key → conditional user update expected version → delete previous returned by winning update. Loser deletes own new object. B serialize per-user update (DB row lock/keyed lock). C avatar versioned records + active pointer, background GC. Never delete `currentFilePath` supplied/stale from client without comparing authoritative row.
</details>

<details><summary>Thinking/test</summary>

Junior upload then delete; Middle optimistic version/compensation; Senior cross-store failure, malicious path input, CDN cache and orphan repair. Coordinate A/B after uploads and reverse DB update completion.
</details>

### [MEDIA-08] Direct-to-MinIO upload session

**L4 · SEC/DST · presigned upload, finalize, checksum, ownership · 3 hướng · feature mới**

**Bối cảnh:** backend proxy wastes bandwidth and request lifetime. **Invariant:** client only writes allocated prefix/size/type; object not public until finalize validation.

**Task:** Initiate→Upload→Finalize/Abort state machine.

<details><summary>3 approaches</summary>

A backend proxy current. B presigned single PUT for bounded file. C presigned multipart for large/resume. Initiate reserves quota and object key; finalize stats object, checks size/checksum/content, re-authorizes target, commits metadata/outbox. Session has expiry; orphan cleanup aborts stale. Do not trust client “upload succeeded”.
</details>

<details><summary>Thinking/DoD</summary>

Junior generate URL; Middle session/finalize/auth; Senior confused-deputy threat, checksum, quota race, expiry/replay, CORS and cleanup operations. Test user finalizes another user's key and target permission revoked mid-upload.
</details>

### [MEDIA-09] Resumable multipart upload

**L5 · STR/DST/CON · chunk, idempotent part, ETag, checksum, resume · 3 hướng**

**Bối cảnh:** video lớn/mạng mobile rớt. **Invariant:** part retry not duplicate, complete only exact authorized parts, abandoned upload bounded.

**Task:** protocol/API/storage session, concurrent part limit and resume tests.

<details><summary>Các cách</summary>

A chunks through backend into temp storage. B MinIO multipart presigned part URLs, store uploadId/part ETags. C tus protocol/library adapter. State `Initiated/Uploading/Completing/Completed/Aborted/Expired`; finalize guarded CAS so two complete requests safe. Validate total checksum, max parts/size and ownership; scheduled abort stale multipart.
</details>

<details><summary>Senior thinking</summary>

Junior split chunks; Middle session/idempotent finalize; Senior distributed state ambiguity, eventual object visibility, quota reservation, parallel chunk tuning and abuse. Chaos network after MinIO accepted part but before client response.
</details>

### [MEDIA-10] Virus-scan quarantine workflow

**L4 · SEC/DST/RES · quarantine, scan result, retry/DLQ, fail policy · 3 hướng**

**Bối cảnh:** user upload untrusted media; scanner may timeout. **Invariant:** unscanned/suspicious object never served publicly; result/audit deterministic.

**Task:** media state, scanner worker, timeout/retry and manual review.

<details><summary>3 modes</summary>

A synchronous scan in request; simple/latency. B async quarantine + pending UI + publish after clean; recommended. C optimistic serve/retract; generally unacceptable for malware risk. Events via outbox; consumer idempotent by media/version. Permanent corrupt→Rejected, transient scanner failure→Retry, exhaustion→Manual/DLQ. Signed scanner access to quarantine only.
</details>

<details><summary>Thinking/test</summary>

Junior call antivirus; Middle state/retry/access; Senior fail-open/closed, scanner supply-chain/isolation, archive bombs, privacy and SLA. Test scan clean/infected/timeout/duplicate/out-of-order result.
</details>

### [MEDIA-11] Thumbnail/transcoding worker có CPU bulkhead

**L4 · PAR/STR/RES · CPU-bound, work queue, resource limits, derivative version · 4 hướng**

**Bối cảnh:** image resize/video transcode không được chạy vô hạn trong request/API process. **Invariant:** original immutable, derivative tied to processing version, CPU/disk/memory bounded.

**Task:** background job model, progress/error and rollout new rendition versions.

<details><summary>4 hướng</summary>

A inline resize for tiny image only. B hosted bounded worker; single node durability risk. C Kafka/job-table workers. D external media service. Separate queues image/video, constrain process/container, temp disk and timeout; idempotency `(mediaId,profileVersion)`. Store derivative metadata before exposing; cleanup old versions asynchronously.
</details>

<details><summary>Thinking/DoD</summary>

Junior use library/FFmpeg; Middle queue/cancel/cleanup; Senior hostile media sandbox, capacity, priority/fairness, retry permanent vs transient and cost. Load test video jobs while HTTP latency remains within SLO.
</details>

### [MEDIA-12] Content-hash dedup nhưng giữ ownership

**L4 · SEC/DAT/STR · SHA-256 streaming, physical object, logical reference, refcount · 3 hướng**

**Bối cảnh:** many users upload same file; dedup saves storage but can leak existence. **Invariant:** each logical media permission independent; physical deletion only no refs; hash lookup not oracle.

**Task:** stream hash during upload and model PhysicalObject↔MediaAsset.

<details><summary>3 scopes</summary>

A no dedup baseline. B dedup per user/community (privacy safer). C global dedup with strict opaque lookup/internal-only. Refcount updates transactionally with media refs; deletion/reconciliation correct under race. Hash alone doesn't validate safe content; scan status/profile belongs physical version or each logical policy.
</details>

<details><summary>Thinking/test</summary>

Junior hash filename; Middle unique hash/refcount; Senior confirmation side-channel, tenant isolation, collision handling, encryption keys and race delete/add. Test two concurrent first uploads and delete one ref.
</details>

### [MEDIA-13] Orphan reconciliation MinIO ↔ MySQL

**L4 · STR/OBS · inventory, keyset, checkpoint, dry-run · 3 hướng · batch tool**

**Bối cảnh:** compensation cannot guarantee cleanup after crash. **Invariant:** never delete recently uploading/referenced object; job resumable/idempotent.

**Task:** scan metadata/object prefixes, classify missing/orphan/stale-pending and repair policy.

<details><summary>3 implementations</summary>

A DB rows page then Stat object finds missing; plus object listing finds orphan. B generate sorted inventories and streaming merge for scale. C storage inventory feature/object events. Use grace period/upload session state, checkpoint, dry-run report and quarantine-before-delete. Missing referenced object marks media broken and alerts; don't silently drop business record.
</details>

<details><summary>Thinking/DoD</summary>

Junior list all into memory; Middle keyset/batch/cancel; Senior race with active upload, eventual listing semantics, blast radius/approval and audit. Millions-object fixture must stay bounded; kill/resume.
</details>

### [MEDIA-14] Export user/community data bằng streaming archive

**L4→L5 · STR/DAT/SEC · JSONL, ZIP streaming, snapshot, checkpoint · 3 hướng · privacy/export feature**

**Bối cảnh:** export posts/comments/chat/media metadata can exceed memory/request timeout. **Invariant:** authorized snapshot, no other-user private data, result encrypted/expiring.

**Task:** async export job, page each store, stream archive/object storage and notify completion.

<details><summary>3 hướng</summary>

A synchronous HTTP stream for small export. B job creates JSONL/ZIP in MinIO via streaming, status endpoint. C per-domain shards then manifest archive. Define snapshot high-water mark for changing data; Cassandra/chat permissions; chunk/keyset; cancellation/checkpoint. Signed download short TTL, encryption and deletion after retention.
</details>

<details><summary>Senior acceptance</summary>

Capacity/disk/temp budget, access audit, retry partial shard, consistency note in manifest. Chaos process crash and permission change. Explain why returning `List<T>` or building ZIP entirely in RAM fails.
</details>
