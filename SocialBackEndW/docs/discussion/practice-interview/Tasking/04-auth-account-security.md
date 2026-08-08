# Authentication, Account và Security

Các task bám vào JWT access/refresh, Redis blacklist/login failures, Argon2, password reset, `IPLogin`, SignalR authentication và user/follow hiện tại. Luôn threat-model trước khi chọn pattern.

### [AUTH-01] Chuẩn hóa email/username và race registration

**L2→L3 · DAT/CON/SEC · normalization, collation, unique constraint, TOCTOU · 3 hướng · user registration**

**Bối cảnh:** `User@Mail.com`, whitespace/Unicode và hai request cùng lúc. **Invariant:** identity canonical duy nhất; đúng một user được tạo.

**Task:** định nghĩa normalization policy, migration và exception mapping.

<details><summary>3 hướng</summary>

A normalize trong service; dễ bị bypass. B value object + normalized columns/index; cân bằng tốt. C dựa DB case-insensitive collation; hành vi Unicode/provider cần hiểu. `Exists→Insert` chỉ UX optimization; unique constraint là arbiter. Có thể thêm idempotency key để retry trả cùng result.
</details>

<details><summary>Thinking/test</summary>

Junior Trim/Lower; Middle normalized index và map duplicate 409; Senior Unicode/collation, migration conflict, enumeration/privacy và idempotency. Test 50 concurrent variants case/space.
</details>

### [AUTH-02] Bỏ plaintext fallback, rehash legacy khi login

**L3 · SEC/PRF · Argon2id, rehash-on-login, constant-time, migration · 3 hướng · `Argon2PasswordHashService`**

**Bối cảnh:** legacy fallback so plain text là rủi ro; hash params có thể đổi. **Invariant:** không lưu/so plaintext; login đúng không bị gián đoạn; update hash race-safe.

**Task:** nhận diện format hash, lazy rehash và rollout metrics.

<details><summary>Cách làm</summary>

A buộc reset tất cả legacy; an toàn nhưng UX xấu. B verify legacy trusted format, rồi Argon2 rehash trong login transaction/conditional update. C staged migration theo cohort. Không thể background rehash nếu không có password. Giới hạn concurrent Argon2 để chống CPU DoS nhưng không tự giảm parameters dưới security policy.
</details>

<details><summary>Thinking/DoD</summary>

Junior đổi function; Middle format/version và race two logins; Senior key/parameter governance, timing, rollback và migration dashboard. Tests: invalid format không crash, correct legacy upgrades một lần, concurrent login không làm mất hash tốt hơn.
</details>

### [AUTH-03] Login throttling atomic và phân tán

**L3 · SEC/CON/DST · Redis Lua, fixed/sliding window, IP+identity · 4 hướng · `CacheAdapter`, rate limiter**

**Bối cảnh:** nhiều app instance/bot IP; NAT có nhiều user. **Invariant:** không khóa nạn nhân dễ dàng, counter/TTL atomic, response không leak account existence.

**Task:** bật middleware/policy đúng, thiết kế layered limiter và concurrent tests.

<details><summary>4 chiến lược</summary>

A ASP.NET in-memory per IP; chỉ một node. B Redis INCR+expiry atomic Lua. C token/sliding bucket theo email hash + IP + global. D gateway/WAF kết hợp application. Email key phải normalize/hash, TTL set atomically; success reset có race với failed request cần semantics/version. Trả generic response + `Retry-After`.
</details>

<details><summary>Thinking/test</summary>

Junior fixed window; Middle distributed atomic and partitions; Senior credential stuffing vs targeted lockout, fail-open/closed Redis, privacy/cardinality và telemetry. Mô phỏng 1 IP nhiều account, một account nhiều IP, success/failure concurrent.
</details>

### [AUTH-04] Password reset token single-use thực sự

**L3→L4 · SEC/CON/DAT · one-time token, Redis `GETDEL`, compare-and-delete, replay · 3 hướng**

**Bối cảnh:** read token → update password → remove token cho phép hai request cùng dùng. **Invariant:** chỉ một password change; token hash/expiry an toàn; failure semantics rõ.

**Task:** thiết kế state machine và test race bằng barrier.

<details><summary>3 cách và ambiguity</summary>

A Redis `GETDEL` trước DB update: single claimant nhưng DB fail làm mất token. B Lua claim token (`Issued→Claimed`) rồi finalize/rollback có deadline. C DB reset-token row + user update trong một transaction: correctness mạnh nhất. Sau reset cần revoke sessions/token family. Không log raw token; response chống enumeration.
</details>

<details><summary>Level thinking/acceptance</summary>

Junior get/remove; Middle atomic consume + password transaction; Senior crash between claim/update, recovery, session revocation và abuse. Hai concurrent calls: đúng một success; retry sau ambiguous timeout có status rõ.
</details>

### [AUTH-05] Refresh token rotation và reuse detection

**L4 · SEC/CON/DAT · token family, `jti/sid`, CAS, hashed token · 3 hướng · `AuthenticationAdapter`, `IPLogin`**

**Bối cảnh:** refresh đang gần như JWT thường và latest login chưa model multi-device. **Invariant:** mỗi use rotate; replay token cũ revoke family; concurrent tabs có policy rõ.

**Task:** session/token-family schema, atomic exchange và device tests.

<details><summary>3 hướng</summary>

A opaque random refresh token, DB lưu hash+family/version; dễ revoke. B JWT refresh có jti/sid nhưng vẫn cần state reuse. C Redis sessions + durable audit DB. Exchange là conditional update `current hash/version`; grace window cho legitimate parallel refresh có security trade-off. Access/refresh phải khác `typ`, audience/lifetime.
</details>

<details><summary>Thinking/DoD</summary>

Junior phát token mới; Middle CAS và store hash; Senior family compromise response, multi-region clock, grace window, migration và metrics reuse. Test stolen old token sau rotation và two-tab concurrent refresh.
</details>

### [AUTH-06] Multi-device sessions, logout one/all

**L3 · SEC/DAT · session ID, device metadata, revocation · 3 hướng · `IPLogin`**

**Bối cảnh:** user cần xem/revoke phiên; IP không phải device identity. **Invariant:** chỉ owner xem/revoke; raw refresh token không hiển thị; revoke có bounded propagation.

**Task:** session list API, last seen, current-device marker và revoke flows.

<details><summary>Các model</summary>

A mở rộng IPLogin thành session row. B `UserSession` riêng + refresh history. C Redis active sessions và DB audit. Device name là user-provided/untrusted; fingerprint có privacy issue. `logout all except current` cần atomic version/session query; short access TTL hoặc blacklist sid cho propagation.
</details>

<details><summary>Thinking/test</summary>

Junior list IP; Middle sid/hash/authorization; Senior privacy/retention, stolen session UX, cache invalidation và incident audit. Test revoke while refresh in flight.
</details>

### [AUTH-07] JWT blacklist không nằm trên raw token và không block thread

**L3→L4 · ASY/SEC/RES · token hash/jti, async validation, fail-open/closed · 4 hướng · JWT events + Redis**

**Bối cảnh:** raw access token làm Redis key và `.Result` trên validation path. **Invariant:** không expose secret, không ThreadPool starvation, revoke semantics documented.

**Task:** migrate blacklist key, async callback, timeout và Redis-down policy.

<details><summary>4 hướng</summary>

A blacklist SHA-256/jti tới expiry. B session version claim, compare cache/DB. C access token rất ngắn, không blacklist. D introspection/reference token. Redis lookup mỗi request làm dependency critical; local cache negative/positive có staleness. Endpoint nhạy cảm có thể fail-closed, public content fail-open theo threat model.
</details>

<details><summary>Thinking/acceptance</summary>

Junior await Redis; Middle timeout/cancellation/hash key; Senior availability-security matrix, revocation SLO và latency budget. Load test Redis delay/down: no thread starvation; security behavior đúng bảng quyết định.
</details>

### [AUTH-08] Email verification và resend cooldown

**L3 · SEC/DST · opaque token, one-time, cooldown, outbox · 3 hướng · registration/Kafka/email**

**Bối cảnh:** verification link cần hoàn chỉnh và retry-safe. **Invariant:** token single-use, đúng email/version, resend không spam, account policy rõ trước verify.

**Task:** state/token schema, verify/resend endpoints, event/outbox và tests.

<details><summary>3 hướng</summary>

A signed JWT + user email version; revoke phụ thuộc version. B opaque token hash DB; atomic consume/audit tốt. C Redis TTL token; nhanh, durability thấp. Resend có thể invalidate previous hay cho nhiều active tokens—phải quyết định. Email đổi làm token cũ invalid. Publish mail bằng outbox để DB commit không mất event.
</details>

<details><summary>Thinking/test</summary>

Junior token expiry; Middle single-use/cooldown; Senior unverified capabilities, deliverability, account enumeration, support/recovery. Test verify/resend/email-change concurrent.
</details>

### [AUTH-09] Resource-based authorization cho SocialBackEnd

**L3 · SEC · `IAuthorizationHandler`, ownership, community capability · 3 hướng · post/media/chat/community**

**Bối cảnh:** ownership/role checks rải trong services/hubs/controllers. **Invariant:** cùng rule cho REST và SignalR; deny-by-default; không IDOR.

**Task:** authorization matrix, requirements/handlers và regression suite.

<details><summary>3 kiến trúc</summary>

A guards rải rác; baseline dễ drift. B handlers theo resource/action. C domain capability evaluator gọi từ handlers/services và trả reason internal. Attribute claim-only không đủ cho resource membership. Query list phải filter ở DB, không load rồi authorize từng item gây N+1/leak pagination counts.
</details>

<details><summary>Thinking/DoD</summary>

Junior actorId==ownerId; Middle reusable handler và tests; Senior authn vs authz vs discoverability, cache staleness, audit denies không lộ PII. Test matrix REST/Hub/media cho guest/member/banned/mod/owner.
</details>

### [AUTH-10] Private follow request state machine

**L3 · SEC/CON/DAT · Pending/Accepted/Rejected/Blocked, idempotency · 3 hướng · `UserFollow`**

**Bối cảnh:** private account không nên follow trực tiếp. **Invariant:** block thắng retry; một relationship pair; notification không duplicate.

**Task:** commands Request/Accept/Reject/Cancel/Block/Unblock và transition tests.

<details><summary>Các model</summary>

A thêm status vào UserFollow. B FollowRequest riêng, accepted mới tạo follow. C unified directed relationship state. B giữ accepted table sạch; C biểu đạt block phức tạp tốt hơn. Pair direction quan trọng; two-way/mutual query phải đổi. Unique constraint xử lý concurrent requests, event outbox notify.
</details>

<details><summary>Thinking/test</summary>

Junior endpoints; Middle transition/idempotency/auth; Senior privacy leak trong search/count, race accept-vs-block, data migration và notification ordering.
</details>

### [AUTH-11] JWT signing-key rotation không downtime

**L4 · SEC/OBS · `kid`, key ring, overlap, secret manager · 3 hướng · security configuration**

**Bối cảnh:** một HMAC secret config trực tiếp khó rotate. **Invariant:** token hợp lệ trong overlap vẫn verify; compromised key revoke khẩn cấp; secret không vào repo/log.

**Task:** key ring, issuer signing selection/validation, runbook và rolling-deploy test.

<details><summary>3 hướng</summary>

A multiple HMAC keys by kid. B RSA/ECDSA key pairs, publish verify keys. C external identity provider. Rotation: add new verify key → sign new → wait max TTL → remove old. Emergency differs planned rotation. Validate minimum entropy/options-on-start và source từ secret manager/environment.
</details>

<details><summary>Thinking/DoD</summary>

Junior move env; Middle kid/key ring; Senior ownership, compromise drill, audit, cache propagation và rollback. Spin old/new app versions concurrently and verify both token cohorts.
</details>

### [AUTH-12] Account deletion xuyên nhiều data stores

**L5 · SEC/DST/DAT · deletion saga, tombstone, retention, pseudonymization · 4 hướng · MySQL/MinIO/Cassandra/Elastic/Kafka**

**Bối cảnh:** cascade trigger/DB không xóa external data và late events có thể tạo lại projection. **Invariant:** revoke access ngay; deletion idempotent/resumable; retention/legal policy rõ.

**Task:** workflow, per-store steps/checkpoints, tombstone event và reconciliation.

<details><summary>4 cách</summary>

A synchronous delete; dễ timeout/partial. B job table orchestrated saga. C Kafka choreography. D anonymize core data + async purge media/chat/index. Thường revoke/pseudonymize trước, purge sau. Tombstone/version ngăn old event rehydrate user. Có dry-run/admin status, retry DLQ và manual resume.
</details>

<details><summary>Senior thinking/test</summary>

Junior cascade entities; Middle background job; Senior data inventory/ownership, legal hold, backup/retention, late event, RPO và proof-of-deletion. Kill process mỗi step và inject duplicate/out-of-order deletion events.
</details>

### [AUTH-13] Security headers, forwarded proxy trust và production config

**L3 · SEC/OBS · trusted proxy, CORS, HSTS, secret validation · 3 hướng · `Program.cs`, DI config**

**Bối cảnh:** forwarded options clear trusted networks; rate limiter configured nhưng pipeline/policies cần kiểm chứng; detailed SignalR errors không nên production. **Invariant:** client không spoof scheme/IP; origin/credentials đúng; secrets fail fast.

**Task:** production threat review và environment-specific secure defaults.

<details><summary>Phân rã</summary>

Xác định deployment proxy topology; chỉ trust known proxy/network. Đặt forwarded headers đúng thứ tự trước components dùng scheme/IP. Bật rate limiter middleware/policies, HSTS, CORS allowlist; disable detailed errors. A configure app; B reverse proxy/gateway owns headers/rate; C both layered. Options `ValidateOnStart`, secret không hardcode.
</details>

<details><summary>Thinking/acceptance</summary>

Junior bật middleware; Middle order/env config/tests; Senior trust boundary, spoof test, proxy failover, configuration ownership/runbook. Integration tests crafted X-Forwarded-For từ untrusted source không đổi limiter/audit identity.
</details>

### [AUTH-14] Auth incident observability không log PII/secrets

**L3→L4 · OBS/SEC · structured logs, trace, redaction, audit · 3 hướng · auth/reset/email pipeline**

**Bối cảnh:** cần trả lời reset mail chậm/mất ở HTTP, Kafka, OAuth hay SMTP. **Invariant:** correlation được; không log password/token/OAuth body/raw email tùy policy.

**Task:** event IDs, redaction rules, metrics và incident dashboard/runbook.

<details><summary>Hướng làm</summary>

A logging scopes/correlation thủ công. B OpenTelemetry traces qua HTTP/Kafka headers. C vendor APM. Metrics: login outcome reason coarse, throttle, refresh reuse, verification age, reset delivery latency; không label user/email/event id. Audit security khác debug log về retention/access.
</details>

<details><summary>Level thinking/DoD</summary>

Junior thêm logs; Middle structured/redacted/trace ID; Senior data classification, sampling, cardinality/cost, burn-rate alert và forensic access. Chaos Redis/Kafka/SMTP delay; dashboard phải định vị bottleneck trong vài phút.
</details>
