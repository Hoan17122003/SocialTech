# Migration, Data Governance, Security và Disaster Recovery

Quy tắc: migration không kết thúc khi script chạy thành công; phải chứng minh application cũ/mới cùng hoạt động, dữ liệu được verify, rollback/forward-fix khả thi và restore thật sự chạy được.

### [GOV-01] Expand–migrate–contract một cột nóng

**L3 · EF Core/MySQL · zero-downtime migration**

**Đề bài:** thay `User.Name` thành `DisplayName` + `NormalizedName` khi nhiều app version đang chạy.

<details><summary>Gợi ý</summary>
Expand nullable columns/index, dual-write hoặc DB-generated strategy, backfill bounded, shadow compare, chuyển read, enforce constraint rồi contract sau compatibility window. Rollback trước contract khác sau contract.
</details>

### [GOV-02] Backfill hàng trăm triệu rows

**L4 · Online data migration · chunk, checkpoint**

**Đề bài:** tính `PublishedAtUtc`/normalization cho bảng lớn mà không lock lâu, làm đầy binlog hoặc phá replica lag.

<details><summary>Gợi ý</summary>
Keyset chunk, conditional update, transaction nhỏ, throttle theo DB health, checkpoint và estimate completion. New writes phải đúng ngay; verify count/sample/checksum.
</details>

### [GOV-03] Tạo index online

**L3 · MySQL · DDL, lock impact**

**Đề bài:** thêm composite index cho feed production; dự đoán disk, build time, write amplification và metadata lock.

<details><summary>Gợi ý</summary>
Kiểm tra provider/version `ALGORITHM`/`LOCK`, replica/canary, free disk và long transaction. Có abort threshold, monitor và query plan before/after.
</details>

### [GOV-04] Thay primary/foreign key strategy

**L5 · Online migration · dual identity**

**Đề bài:** chuyển int identity sang UUID/ULID cho một aggregate có nhiều FK và event references.

<details><summary>Gợi ý</summary>
Thêm alternate id unique, backfill, dual-read/write mapping, migrate child/event/search/cache theo phases. Đánh giá index locality/size, public id enumeration và rollback.
</details>

### [GOV-05] Data classification catalog

**L3 · Governance · PII, sensitivity, owner**

**Đề bài:** catalog mọi field/event/object theo public/internal/PII/sensitive/secret, owner, purpose và retention.

<details><summary>Gợi ý</summary>
Source scan + runtime lineage; không chỉ spreadsheet chết. Gate schema/event PR, default classification, encryption/logging rule và periodic review.
</details>

### [GOV-06] Retention và legal hold engine

**L4 · Governance · policy, purge**

**Đề bài:** retention khác nhau cho log, chat, media, notification, security audit và backup; legal hold override purge.

<details><summary>Gợi ý</summary>
Versioned policy, effective dates, subject/resource scope, candidate/approval/execution stages và proof. Purge idempotent xuyên store; backup expiry được ghi rõ.
</details>

### [GOV-07] Encryption và key rotation

**L4 · Security · envelope encryption, KMS**

**Đề bài:** mã hóa secret/PII nhạy cảm at rest và rotate key không downtime.

<details><summary>Gợi ý</summary>
Phân biệt disk encryption và field-level encryption. Key id cạnh ciphertext, envelope encryption, dual decrypt/new-key encrypt, lazy/batch re-encrypt, access audit và lost-key recovery.
</details>

### [GOV-08] Secret không xuất hiện trong log/config

**L3 · Security · secret management, redaction**

**Đề bài:** rà `.env`, appsettings, exception, HTTP/Kafka payload logs để chặn JWT, OAuth token, SMTP và MinIO credentials bị lộ.

<details><summary>Gợi ý</summary>
Secret store/env injection, startup validation không in value, structured redaction, payload allowlist và secret scanning CI. Có incident rotation/revocation runbook.
</details>

### [GOV-09] Row/tenant isolation

**L4 · Authorization · tenant boundary**

**Đề bài:** nếu SocialBackEnd phục vụ nhiều organization, mọi query/cache/event/object phải không leak tenant.

<details><summary>Gợi ý</summary>
TenantId trên key/unique/index/FK, global query filter chưa đủ cho raw SQL. Cache/object prefix/event metadata, service account scope, negative isolation tests và cân nhắc DB-per-tenant.
</details>

### [GOV-10] Audit log chống chỉnh sửa

**L4 · Security audit · append-only, integrity**

**Đề bài:** lưu actor/action/resource/before-after/correlation; admin database không dễ sửa mà không bị phát hiện.

<details><summary>Gợi ý</summary>
Append-only privilege, hash chain/batch Merkle anchoring hoặc WORM export. Mask sensitive fields, clock/source identity, retention/search và verification job.
</details>

### [GOV-11] Backup strategy theo store

**L4 · Backup · full/incremental/PITR**

**Đề bài:** định nghĩa backup MySQL, Cassandra, MinIO, Kafka config/schema và encryption keys theo RPO/RTO.

<details><summary>Gợi ý</summary>
Backup topology, offsite/immutable copies, retention, encryption, inventory và ownership. Redis/search projection có thể rebuild nhưng phải tính rebuild time/data source.
</details>

### [GOV-12] Restore drill tự động

**L5 · DR · restore verification**

**Đề bài:** hàng tháng dựng môi trường cô lập từ backup, chạy invariant/data-quality và đo RTO.

<details><summary>Gợi ý</summary>
IaC, secret/key access, malware-safe isolation, schema/application compatibility, checksums/business queries và signed report. Backup chưa restore-test không được coi là backup đáng tin.
</details>

### [GOV-13] Region outage failover

**L5 · Multi-region DR · DNS, data loss**

**Đề bài:** region chính mất hoàn toàn; quyết định failover trong 30 phút khi replica có thể lag 2 phút.

<details><summary>Gợi ý</summary>
Decision authority, fencing old primary, RPO communication, DNS/traffic, dependency readiness, consistency verification và failback. Test split-brain và queued clients retry.
</details>

### [GOV-14] Ransomware/destructive admin action

**L5 · Security recovery · immutable backup**

**Đề bài:** privileged credential bị chiếm và attacker xóa database/object. Thiết kế blast-radius reduction và clean-room recovery.

<details><summary>Gợi ý</summary>
MFA/JIT access, separate backup account, object lock/immutable retention, deletion protection, audit ngoài trust domain. Rotate credentials, forensic preservation và staged restore.
</details>

### [GOV-15] Supply-chain và migration governance

**L4 · CI/CD · package, migration review**

**Đề bài:** package/provider update có migration diff bất thường hoặc vulnerability; chặn deploy thiếu kiểm soát.

<details><summary>Gợi ý</summary>
Lockfiles/SBOM/signature, vulnerability policy, generated migration diff review, ephemeral DB test, least-privilege migration account và approval trail.
</details>

### [GOV-16] Game day tổng hợp

**L5 · Resilience · incident command**

**Đề bài:** đồng thời MySQL failover, Kafka lag, Redis flush và Elasticsearch red. Chạy tabletop rồi failure injection có kiểm soát.

<details><summary>Tiêu chí hoàn thành</summary>
User impact/SLO, detection, incident roles, dependency priority, degrade mode, stop-the-bleeding, restore/reconcile, communication, timeline và action items có owner/deadline.
</details>
