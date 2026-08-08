# Đồ án nâng cao và lộ trình triển khai

Các capstone dưới đây kết hợp nhiều task thay vì chỉ làm một pattern. Bạn phải nộp design document trước code, sau đó triển khai lát cắt dọc, đo đạc, chủ động tạo lỗi và bảo vệ trade-off trong buổi review giả lập.

## 1. Capstone A — Community Platform v2

**Phạm vi:** private community, invite/quota, membership approval, role/permission, versioned rules, moderation/appeal và audit.

**Bắt buộc:** state machine/invariant; relational schema + constraints/indexes; concurrent join/approve/transfer tests; outbox notification; permission cache invalidation; expand/contract migration từ model hiện tại.

**Bài phá hệ thống:** hai moderator quyết định trái ngược; owner transfer đồng thời ban; Redis mất; Kafka duplicate; deploy old/new version cùng lúc.

<details><summary>Gợi ý hướng Senior</summary>
MySQL giữ source of truth. Tách permission correctness khỏi cache optimization. Mọi transition quan trọng conditional và audit cùng transaction; event chỉ phát từ outbox. Có reconciliation member counter/role ownership.
</details>

## 2. Capstone B — Feed và Recommendation Platform

**Phạm vi:** candidate generation từ follow/community/trending, ranking, block/privacy filter, keyset cursor, A/B test và explanation.

**Bắt buộc:** workload/capacity; fan-out hybrid decision; event schema; online/offline features; Elasticsearch/Redis/ClickHouse POC; deletion propagation; experiment metrics.

**Bài phá hệ thống:** celebrity publish; hot partition; recommendation lag; post private sau khi đã fan-out; model rollback; user opt-out/delete.

<details><summary>Gợi ý</summary>
Tách candidate, policy filter và ranker để correctness không phụ thuộc model. Source post/permission ở OLTP; mọi projection versioned/rebuildable. Chronological fallback là degraded mode quan trọng.
</details>

## 3. Capstone C — Chat và Media quy mô lớn

**Phạm vi:** idempotent message, ordering, read cursor, offline sync, edit/delete, media upload/scan/transform, search và tiered archive.

**Bắt buộc:** Cassandra bucket model; MySQL conversation metadata; MinIO lifecycle; Kafka side effects; Elasticsearch versioning; SignalR backpressure; multi-store reconciliation.

**Bài phá hệ thống:** duplicate/out-of-order; hot conversation; slow client; orphan object; scanner timeout; consumer lag; restore nhiều store.

<details><summary>Gợi ý</summary>
Ghi rõ source of truth từng field. Message durable trước realtime delivery; client luôn có sync path. Version/tombstone ngăn resurrection; media state machine ngăn truy cập trước scan.
</details>

## 4. Capstone D — Notification và Workflow Engine

**Phạm vi:** in-app/email/push, user preference/quiet hours/digest, retry/DLQ, configurable approval workflow và webhook đối tác.

**Bắt buộc:** outbox/inbox; delivery ledger; workflow definition version; scheduler/lease/fencing; template/schema version; rate limit và observability.

**Bài phá hệ thống:** SMTP ambiguous timeout; provider outage; duplicate event; preference đổi khi job chờ; webhook SSRF; worker crash giữa transition.

<details><summary>Gợi ý</summary>
Phân biệt business notification với delivery attempt. Workflow instance không phụ thuộc definition mới; mọi handler idempotent. Không hứa exactly-once cho external side effect.
</details>

## 5. Capstone E — Data Platform và Product Analytics

**Phạm vi:** integration events, Debezium/outbox CDC, Kafka processing, ClickHouse dashboard, Parquet lake, A/B experiments và data quality.

**Bắt buộc:** schema registry/compatibility; event-time/watermark; partition/capacity; backfill; privacy lineage; freshness/completeness checks; DR replay.

**Bài phá hệ thống:** schema breaking change; connector dừng 12 giờ; late events; duplicate exposure; small-files explosion; user deletion.

<details><summary>Gợi ý</summary>
Metric definition và ownership quan trọng ngang công nghệ. Raw→curated layers, lineage và version. Realtime và backfill dùng cùng business transformations hoặc có parity tests.
</details>

## 6. Capstone F — Search và AI Safety Platform

**Phạm vi:** Vietnamese lexical search, hybrid vector, autocomplete, RAG nội quy, moderation, prompt security và model evaluation.

**Bắt buộc:** relevance/safety test sets; embedding/model/prompt lifecycle; ACL filter; latency/cost budget; kill switch/canary; derived-data deletion.

**Bài phá hệ thống:** prompt injection; provider đổi model âm thầm; stale permission index; vector model migration; harmful output; quota exhaustion.

<details><summary>Gợi ý</summary>
Không production hóa chỉ từ demo. Version mọi artifact, tách retrieval/ranking/generation/policy, fallback deterministic và audit tool call. Đánh giá quality, safety, latency, cost cùng một gate.
</details>

## 7. Capstone G — Zero-downtime Data Modernization

**Phạm vi:** sửa schema drift/constraints, thay key strategy, backfill lớn, index online, split read model và loại bỏ một store.

**Bắt buộc:** dependency inventory; expand–migrate–contract; dual-read shadow; data verification; old/new compatibility; rollback/forward-fix; load test.

**Bài phá hệ thống:** deploy rollback giữa dual-write; replica lag; backfill crash; index disk full; mismatched checksums; event đến trong cutover.

<details><summary>Gợi ý</summary>
Mỗi phase có entry/exit criteria, metric và kill switch. Không contract cho đến hết compatibility window và backup/restore được cập nhật. Migration là product operation, không chỉ DDL.
</details>

## 8. Capstone H — Disaster Recovery và Data Governance

**Phạm vi:** data classification, retention/legal hold, encryption/key rotation, backup/restore, region failover và ransomware response.

**Bắt buộc:** data inventory/lineage; RPO/RTO theo domain; immutable backup; monthly restore drill; multi-store recovery manifest; incident/runbook.

**Bài phá hệ thống:** mất key; backup corrupted; attacker có admin; old primary quay lại; legal hold xung đột deletion; projection restore lệch.

<details><summary>Gợi ý</summary>
Chứng minh bằng restore game day. Xếp source of truth/rebuildable stores, fence writer cũ, verify invariants và reconcile trước mở traffic. Ghi rõ ai có quyền ra quyết định mất dữ liệu.
</details>

## 9. Lộ trình 20 tuần

- **Tuần 1–2:** `00–01`; lập risk register và sửa ba lỗi maintenance có regression test.
- **Tuần 3–4:** `02`; thiết kế năm schema mới, constraint và migration.
- **Tuần 5–6:** `03`; workload catalog, `EXPLAIN`, keyset pagination và capacity budget.
- **Tuần 7–8:** `04`; deterministic concurrency tests, outbox/inbox và reconciliation.
- **Tuần 9–10:** `05`; hai POC store, cache stampede và object lifecycle.
- **Tuần 11–12:** `06–07`; graph/geo hoặc recommendation, search/vector evaluation.
- **Tuần 13–14:** `08`; CDC/stream/ClickHouse và data quality.
- **Tuần 15–16:** `09`; chat/media lifecycle và multi-store repair.
- **Tuần 17–18:** `10`; migration rehearsal, backup/restore drill và security review.
- **Tuần 19–20:** chọn một capstone; load/chaos test, design review và mock interview.

## 10. Bộ hồ sơ phải nộp cho mỗi capstone

1. Requirement, non-goals, assumption và câu hỏi Product.
2. SLO, workload estimate, capacity và cost envelope.
3. Invariant, state machine, API/event contracts và data-flow.
4. Logical/physical schema, indexes, partitions, retention và source of truth.
5. Ít nhất ba phương án cùng trade-off và decision record.
6. Failure matrix: timeout, duplicate, out-of-order, crash, partition, disk full và dependency outage.
7. Test pyramid, concurrency/load/chaos plan và benchmark evidence.
8. Observability dashboard, alert, runbook và reconciliation.
9. Migration/rollout/canary/rollback/forward-fix.
10. Post-implementation review: số đo, debt, ngưỡng cần đổi kiến trúc.

## 11. Rubric 100 điểm

- Tính đúng đắn, invariant và security: 20.
- Data model, query/index và migration: 15.
- Concurrency, consistency, idempotency và ordering: 15.
- Failure recovery, backpressure và capacity: 15.
- Bằng chứng từ test, benchmark, load/chaos: 15.
- Observability, data quality và runbook: 10.
- Trade-off, cost, operability và communication: 10.

**Dưới 60:** mới có happy path. **60–74:** nền tảng Middle. **75–89:** Middle mạnh, có tư duy production. **90+:** tín hiệu Senior nếu tự bảo vệ được mọi quyết định và kết quả tái lập được.

## 12. Cách biến capstone thành câu chuyện phỏng vấn

Dùng cấu trúc: bối cảnh và quy mô → invariant/SLO → constraint thật → các phương án → quyết định → lỗi đã chủ động tạo → số đo trước/sau → trade-off/debt. Không nói “đã dùng Kafka/Redis” như thành tích; nói rõ vấn đề nào khiến baseline không đủ và bằng chứng nào xác nhận quyết định.
