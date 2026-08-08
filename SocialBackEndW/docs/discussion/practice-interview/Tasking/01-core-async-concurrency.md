# Core C#/.NET: Async, Concurrency và Resource Control

Các task trong file này sửa trực tiếp những execution path đang có. Mục tiêu không phải “dùng thật nhiều Task”, mà chọn đúng concurrency model và chứng minh tài nguyên luôn bounded.

### [CORE-01] Truyền cancellation xuyên suốt luồng tạo bài

**L2 · ASY/DAT · `CancellationToken`, point-of-no-return, compensation · 3 hướng · `ArticleController` → `ArticleAdapterPort` → EF/MinIO/Gemini/Kafka**

**Bối cảnh:** nhiều method chưa nhận token. Client ngắt kết nối giữa moderation, DB commit, upload và publish có thể tạo trạng thái khó hiểu. **Invariant:** trước DB commit có thể hủy sạch; sau commit không được nói “không tạo” nếu post đã tồn tại.

**Task:** định nghĩa cancellation boundary, truyền token tới mọi I/O và viết test hủy ở ít nhất bốn điểm.

<details><summary>Gợi ý — phân rã, brainstorm và 3 cách</summary>

Vẽ timeline `moderate → insert post → upload → insert attachment → publish`. Tiêm fake dependency dùng `TaskCompletionSource` để dừng chính xác từng boundary. Cách A: propagate token và compensation trong request; dễ làm nhưng recovery phụ thuộc request sống. Cách B: sau commit bỏ qua request token và hoàn tất critical cleanup bằng deadline nội bộ; semantics rõ hơn nhưng request có thể trả chậm. Cách C: DB ghi `Pending` + outbox, worker finalize; bền nhất nhưng thêm state machine.
</details>

<details><summary>Tư duy Junior / Middle / Senior và kiểm chứng</summary>

- **Junior:** thêm token vào signature và gọi async overload.
- **Middle:** phân biệt cancel trước/sau commit, không catch `OperationCanceledException` thành 500, cleanup partial upload.
- **Senior:** xác định authoritative commit point, recovery khi process crash (khác cancellation), SLO và idempotent retry.
- **Test:** cancel khi Gemini chờ, sau post insert, sau file 2/3, lúc Kafka down; DB/MinIO phải về trạng thái đã mô tả.
</details>

### [CORE-02] Loại bỏ sync-over-async trong media và authentication

**L2 · ASY/PRF · `.Result`, `.GetAwaiter().GetResult()`, ThreadPool starvation · 3 hướng · `MinioEntityMediaStorageService`, JWT validation**

**Bối cảnh:** lấy presigned URL, `FileExists` và token-validation path có synchronous wait. **Invariant:** request thread không block khi dependency I/O chậm; lỗi/cancellation không bị nuốt.

**Task:** đổi contract sang async end-to-end, đo p95 và ThreadPool queue trước/sau dưới tải.

<details><summary>Gợi ý — chia nhỏ và các hướng</summary>

Tìm mọi `.Result/.Wait/GetResult`; phân loại startup-only với request path. A: đổi `FileExistsAsync/GetAbsoluteUrlAsync`; đúng bản chất nhưng lan thay đổi interface. B: chuẩn bị URL tại application boundary và DTO mapping async; giảm leak infrastructure. C: không proxy/presign trong mapping, trả stable media id rồi endpoint resolve; contract tốt hơn nhưng đổi API. Không “sửa” bằng `Task.Run` quanh I/O sync wait.
</details>

<details><summary>Level thinking và acceptance</summary>

Junior thay `Result` bằng `await`; Middle sửa toàn call chain và truyền token; Senior hỏi URL expiry, N+1 calls, dependency-on-hot-path và fail-open/fail-closed của Redis auth. Load test Redis/MinIO delay 500 ms: thread count/queue không tăng mất kiểm soát, throughput không collapse, trace chỉ ra thời gian chờ.
</details>

### [CORE-03] Bounded parallelism khi tạo nhiều presigned URL

**L3 · ASY/CON/PRF · `Task.WhenAll`, `SemaphoreSlim`, `Parallel.ForEachAsync` · 3 hướng · profile/chat candidate/feed DTO mapping**

**Bối cảnh:** tuần tự quá chậm; `WhenAll` vô hạn có thể mở hàng nghìn call MinIO. **Invariant:** giữ đúng thứ tự kết quả, tối đa N I/O, cancel dừng việc mới và không rò semaphore.

**Task:** tạo helper/map pipeline bounded, benchmark N=1/4/8/16 với payload khác nhau.

<details><summary>Gợi ý và trade-off</summary>

A: vòng lặp tuần tự — baseline, dễ đúng. B: `Task.WhenAll` — tốt khi danh sách đã bị giới hạn nhỏ. C: `Parallel.ForEachAsync` hoặc `SemaphoreSlim` — kiểm soát N; cần map index/error. Đừng giữ DbContext trong các task song song vì DbContext không thread-safe; materialize projection trước rồi mới gọi MinIO.
</details>

<details><summary>Junior / Middle / Senior</summary>

Junior thấy “song song nhanh hơn”; Middle nhận ra bounded concurrency, cancellation, partial failure; Senior chọn N từ connection/bandwidth/latency budget, cache URL hoặc thay contract để loại N remote calls. Acceptance gồm order test, fail item thứ k, cancellation và biểu đồ p95/allocation.
</details>

### [CORE-04] Request coalescing khi cache miss hot profile/post

**L3 · CON/PRF · single-flight, cache stampede, `Lazy<Task<T>>` · 4 hướng · `CacheAdapter`, repository reads**

**Bối cảnh:** một key hết TTL khiến hàng trăm request cùng query DB. **Invariant:** cùng instance chỉ một loader/key; caller cancel không hủy loader mà caller khác cần; entry lỗi phải được dọn.

**Task:** tái hiện stampede và triển khai single-flight có giới hạn cardinality.

<details><summary>Brainstorm và 4 cách</summary>

A: không coalesce, chỉ TTL jitter. B: `ConcurrentDictionary<TKey, Lazy<Task<T>>>`; chú ý remove đúng instance trong `finally`. C: keyed semaphore; dễ hiểu nhưng quản lý lifetime. D: distributed lock + double-check cache; multi-node nhưng lease/fencing phức tạp. Có thể thêm stale-while-revalidate thay vì làm mọi caller chờ.
</details>

<details><summary>Thinking/test</summary>

Junior cache-aside; Middle test 100 concurrent misses và exception cleanup; Senior tách correctness cache khỏi optimization, thiết kế Redis-down behavior, memory bound cho key locks và stampede liên node. Đo DB query count phải từ 100 về xấp xỉ 1/instance.
</details>

### [CORE-05] Biến chat side-effect queue thành bounded queue

**L3 · CON/STR/RES · `Channel<T>`, backpressure, full mode, queue depth · 4 hướng · `ChatMessageSideEffectQueue/Worker`**

**Bối cảnh:** queue hiện unbounded; Elasticsearch down có thể làm RAM tăng mãi. **Invariant:** primary message path và memory có behavior xác định khi đầy.

**Task:** đặt capacity, full policy, enqueue deadline, metrics và test overload.

<details><summary>Phân rã và 4 lựa chọn</summary>

Phân loại effect: metadata MySQL có critical không, search/realtime có thể rebuild không? A `Wait`: backpressure nhưng tăng send latency. B `DropOldest/Newest`: bảo vệ API nhưng projection lệch, cần reconciliation. C reject với 503: caller retry có nguy cơ duplicate message. D durable Kafka/outbox: recovery tốt, thêm latency/infra. Queue capacity phải dựa item retained bytes × burst duration, không chọn số đẹp.
</details>

<details><summary>Tư duy và test</summary>

Junior đổi `CreateUnbounded` thành `CreateBounded`; Middle định nghĩa timeout/full behavior và metric depth/drop; Senior phân class durability, overload SLO và đường rebuild. Test worker pause, bơm 100k item, đo RAM và trạng thái message; không OOM/treo vô hạn.
</details>

### [CORE-06] Graceful shutdown cho Kafka và background worker

**L3 · ASY/RES/OBS · drain, cancellation, shutdown deadline, offset commit · 3 hướng · hosted services**

**Bối cảnh:** deploy có thể cắt ngang item đang xử lý hoặc bỏ items trong RAM. **Invariant:** ngừng nhận việc mới, hoàn tất/abandon có chủ đích trong deadline, không commit Kafka trước business effect.

**Task:** viết shutdown state machine và integration test gửi SIGTERM/host stop giữa từng phase.

<details><summary>Gợi ý và các hướng</summary>

Chuỗi shutdown: signal → stop producer/admission → complete writer → drain reader → flush clients → exit. A drain vô hạn (không phù hợp orchestrator); B drain tới deadline rồi persist/requeue; C queue durable nên chỉ ngừng poll và để broker redeliver. Phân biệt `stoppingToken` của host với per-item timeout; không dùng một token đã cancel để flush critical state.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior thoát loop khi token cancel; Middle complete channel/close consumer đúng; Senior căn deadline với deployment termination grace, readiness chuyển false trước và chứng minh at-least-once. Test phải chỉ ra item nào hoàn tất, item nào redeliver, duplicate được dedupe thế nào.
</details>

### [CORE-07] Timeout budget cho Gemini → DB → MinIO

**L3 · RES/ASY · deadline propagation, linked token, retry budget · 3 hướng · article/comment creation**

**Bối cảnh:** mỗi dependency tự timeout dài khiến tổng request vượt SLO. **Invariant:** tổng thời gian không vượt budget đáng kể; không retry mutation không idempotent mù quáng.

**Task:** đặt SLO 2 giây, phân bổ budget và expose timeout reason có trace.

<details><summary>Các hướng và brainstorm</summary>

A timeout cố định mỗi call — đơn giản nhưng cộng dồn. B deadline tuyệt đối truyền xuyên tầng, mỗi call dùng remaining budget. C chuyển slow moderation/media sang async workflow và trả `202 Pending`. Retry chỉ dùng phần budget còn lại, exponential backoff+jitter, phân loại transient. Hỏi: nếu Gemini timeout thì fail-closed, fail-open hay quarantine?
</details>

<details><summary>Thinking/test</summary>

Junior dùng `CancelAfter`; Middle không tạo token rời và map 504/cancel đúng; Senior phân latency budget theo business risk, bulkhead Gemini và degraded-mode policy. Fake clock/dependencies kiểm tra budget, không dùng `Thread.Sleep` trong test.
</details>

### [CORE-08] Pipeline import follower/notification có backpressure

**L3 · STR/CON · producer-consumer, bounded channels, batching, checkpoint · 3 hướng · notification fan-out**

**Bối cảnh:** fan-out follower tuần tự chậm, còn `Task.WhenAll` toàn bộ làm bùng RAM/connections. **Invariant:** memory O(queue capacity), batch retry không bỏ sót, một follower lỗi không phá toàn job.

**Task:** pipeline `read keyset → build DTO → bulk insert → enqueue email` với capacity/concurrency riêng.

<details><summary>Phân rã và cách làm</summary>

A sequential pages: baseline. B bounded `Channel` ba stage: linh hoạt, cần completion/error propagation. C durable batch jobs theo shard: restart tốt, phức tạp hơn. Chọn checkpoint sau commit; retry page phải idempotent. Tính queue memory, DB parameter limit, provider quota và fairness giữa nhiều bài viết.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior foreach; Middle page/batch/bounded workers; Senior capacity, hot author, checkpoint/reconciliation và per-tenant fairness. Chaos test crash trước/sau checkpoint, email 429 và DB chậm; dashboard có oldest-job-age và throughput.
</details>

### [CORE-09] Bulkhead cho Argon2 và Gemini CPU/external work

**L4 · CON/SEC/RES · bulkhead, admission control, CPU saturation · 3 hướng · login/register/moderation**

**Bối cảnh:** nhiều password hash hoặc Gemini call có thể chiếm hết CPU/connection khiến health/API khác chết theo. **Invariant:** workload đắt có quota riêng; hệ thống reject sớm thay vì timeout dây chuyền.

**Task:** benchmark, giới hạn concurrent operation và thiết kế 429/503 + retry-after.

<details><summary>Hướng xử lý</summary>

A semaphore trong process; nhanh triển khai, không global. B partitioned rate limiter/bulkhead theo endpoint+user/IP. C tách worker/service cho CPU-heavy moderation; cô lập tốt, vận hành thêm. Không giảm cost Argon2 tùy theo tải một cách làm yếu security; capacity và rate-limit phải phù hợp tham số hash.
</details>

<details><summary>Thinking/test</summary>

Junior thấy request chậm; Middle đo CPU/ThreadPool và bounded concurrency; Senior threat-model DoS, reserve capacity cho refresh/health, autoscale signal và overload runbook. Load test login flood trong khi đo p99 của feed/health.
</details>

### [CORE-10] Parallel side-effect worker nhưng giữ order theo conversation

**L4 · CON/DST · keyed ordering, actor/mailbox, striped channel · 4 hướng · chat worker**

**Bối cảnh:** một reader giữ order nhưng throughput thấp; tăng reader tùy ý có thể để message cũ ghi đè `LastMessagePreview`. **Invariant:** cùng conversation tuần tự, khác conversation song song.

**Task:** triển khai partitioned scheduler và test hot-key/skew.

<details><summary>Brainstorm 4 hướng</summary>

A giữ single worker. B hash conversation vào N bounded channels: bounded, dễ cleanup, có skew. C per-key semaphore/queue: parallel tốt nhưng cardinality/cleanup race. D Kafka partition key conversation: durable và scale, phụ thuộc partition/rebalance. Dù chọn gì, DB update metadata nên conditional theo `(SentAt, MessageId/sequence)` để chống stale retry.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior tăng `SingleReader=false`; Middle nhận ra ordering; Senior đặt linearization/monotonic invariant tại storage, xử lý hot conversation và repartition rollout. Test deterministic đảo completion nhưng summary cuối vẫn là message mới nhất.
</details>

### [CORE-11] ThreadPool starvation incident drill

**L3 · PRF/OBS · counters, blocking I/O, p99, incident triage · 3 hướng · toàn API**

**Bối cảnh:** CPU thấp nhưng p99 tăng, request queue dài. **Task:** cố tình đưa blocking wait vào MinIO/Redis path, tái hiện, thu bằng chứng và sửa.

<details><summary>Luồng điều tra</summary>

Thu request rate/duration, `thread_pool.queue.length`, thread count, CPU, dependency spans và dump. Giả thuyết A: sync-over-async; B: lock contention; C: connection pool exhaustion. Chỉ thay một biến. Đừng lập tức tăng minimum threads: nó có thể che symptom và tăng pressure dependency.
</details>

<details><summary>Tư duy/DoD</summary>

Junior đọc log exception; Middle dùng counters/trace và viết regression load test; Senior nối symptom với queueing theory, incident timeline, mitigation/rollback và prevention guardrail. Nộp postmortem gồm trigger, impact, detection gap và action items.
</details>

### [CORE-12] Capacity plan và load shedding cho SocialBackEnd

**L5 · PRF/RES/OBS · Little’s Law, p95/p99, admission control · 3 hướng · API/Kafka/chat**

**Bối cảnh:** cần chịu 500 HTTP RPS, 2.000 chat msg/s và burst article fan-out. **Task:** tính in-flight, connection, queue/buffer memory, partition/worker count và ngưỡng reject.

<details><summary>Gợi ý senior decomposition</summary>

Đo service time từng dependency; dùng `L = λW`; cộng headroom và tail. Xác định bottleneck đầu tiên, không scale tất cả. A fixed concurrency limits; B adaptive concurrency dựa latency/queue; C gateway load shedding + per-workload bulkhead. Ưu tiên auth/chat critical hơn Gemini/search refresh; quy định drop/degrade/reject cho từng class.
</details>

<details><summary>Acceptance và interview drill</summary>

Tạo bảng assumptions, phép tính và test xác minh. Khi DB latency tăng 10×, hệ thống phải reject sớm có metric, không để queue/RAM tăng vô hạn. Giải thích vì sao average latency không đủ, vì sao autoscale không thay thế backpressure và ngưỡng nào buộc đổi kiến trúc.
</details>
