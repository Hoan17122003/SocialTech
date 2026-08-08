# Hướng dẫn Task Card và taxonomy kiến thức

## Mẫu dùng cho mọi task

```md
### [DOMAIN-NN] Tên task

**Level · Phạm trù · Keywords · Số hướng · Điểm chạm code**

**Bối cảnh:** symptom/business need.

**Invariant:** điều bắt buộc luôn đúng.

**Yêu cầu:** output cần tự triển khai.

<details><summary>Gợi ý 1 — Đặt và chia nhỏ vấn đề</summary>...</details>
<details><summary>Gợi ý 2 — Các hướng xử lý và trade-off</summary>...</details>
<details><summary>Luồng nghĩ Junior / Middle / Senior</summary>...</details>
<details><summary>Acceptance, test và câu hỏi phỏng vấn</summary>...</details>
```

Khối `<details>` gập trong Markdown Preview/Obsidian/GitHub. Trong editor source, dùng folding của HTML/heading. Không có cách “giấu lời giải tuyệt đối” trong file text; mục đích là tạo ma sát để bạn chưa nhìn ngay.
V
## Taxonomy phạm trù

| Mã | Phạm trù | Dấu hiệu nhận biết | Keyword nền |
|---|---|---|---|
| CON | Concurrency | nhiều execution cùng đụng shared state | race, atomicity, lock, optimistic concurrency |
| ASY | Asynchronous I/O | chờ DB/network/disk | Task, await, cancellation, timeout |
| PAR | Parallelism | chia CPU work chạy nhiều core | partition, degree of parallelism, CPU-bound |
| DAT | Data consistency | nhiều bản ghi/store phải khớp | transaction, isolation, version, invariant |
| DST | Distributed systems | nhiều process/store/network boundary | duplicate, ordering, partition, idempotency |
| STR | Streaming/batch | dữ liệu lớn/đến liên tục | chunk, backpressure, checkpoint, bounded memory |
| SEC | Security | identity, permission, abuse, untrusted input | authn, authz, token, validation, rate limit |
| RES | Resilience | dependency có thể chậm/lỗi | timeout, retry, jitter, circuit breaker, bulkhead |
| PRF | Performance | latency/throughput/allocation | p95/p99, benchmark, GC, index, N+1 |
| OBS | Operability | cần hiểu và phục hồi production | log, metric, trace, health, runbook |

## Luồng đặt vấn đề kiểu Senior

1. Ai bị ảnh hưởng và behavior quan sát được là gì?
2. Contract/SLO nào phải giữ? Non-goal là gì?
3. Source of truth, owner và invariant?
4. Workload: RPS, payload, burst, cardinality, p95 dependency?
5. Vẽ data/control flow; đánh dấu DB/network/process boundary.
6. Failure matrix: fail trước/sau commit, timeout ambiguity, duplicate, out-of-order, crash/restart.
7. Brainstorm baseline + 2 phương án; so correctness, complexity, latency, cost và operability.
8. Thiết kế test bác bỏ giả thuyết; rồi mới code lát cắt nhỏ.
9. Quan sát, rollout, rollback và reconciliation.

## Cách phân biệt tư duy theo level

- **Junior** thường hỏi “API nào giúp code chạy?”. Mục tiêu là contract/happy path và code dễ đọc.
- **Middle** hỏi “khi concurrent, cancel, retry, lỗi nửa chừng thì trạng thái cuối là gì?”. Mục tiêu là correctness và vận hành ổn định.
- **Senior** hỏi “invariant/SLO nào đáng trả complexity, nó hỏng ở boundary nào, đo/rollout/recover thế nào?”. Mục tiêu là quyết định phù hợp với tải và tổ chức, không phải dùng pattern phức tạp nhất.

## Thang tự chấm 20 điểm

Mỗi mục 0–2: contract, invariant, decomposition, alternatives, concurrency, failure recovery, resource bound, security, test evidence, observability/rollout. Dưới 12: làm lại design; 12–15: Junior+; 16–18: Middle; 19–20: senior-ready signal nếu tự giải thích được.
