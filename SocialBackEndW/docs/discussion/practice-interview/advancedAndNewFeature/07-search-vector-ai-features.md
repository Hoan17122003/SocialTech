# Search, Vector và tính năng AI

Quy tắc: đo relevance, safety, latency và cost cùng lúc. AI output là dữ liệu không đáng tin cho đến khi được validate; embedding/model/prompt đều phải version hóa.

### [AI-01] Full-text search tiếng Việt

**L3 · Elasticsearch/OpenSearch · analyzer, ranking**

**Đề bài:** search post/user/community có dấu hoặc không dấu, typo nhẹ, phrase và filter quyền truy cập.

<details><summary>Gợi ý</summary>
Tạo relevance test set có judgment; so analyzer ICU/vi tokenizer, asciifolding, n-gram và synonym. Đo NDCG/MRR, p95, index size; không chỉ thử vài query thủ công.
</details>

### [AI-02] Autocomplete an toàn

**L3 · Search · prefix, popularity, privacy**

**Đề bài:** gợi ý user/tag/community dưới 100 ms nhưng không lộ private/blocked/disabled account và chống offensive suggestions.

<details><summary>Gợi ý</summary>
Edge n-gram/completion field, popularity time-decay, policy filter và minimum prefix. Cache hot prefixes có invalidation; log query phải có privacy retention.
</details>

### [AI-03] Semantic search bằng embedding

**L4 · pgvector/Qdrant/Elasticsearch vector · ANN**

**Đề bài:** tìm post tương đồng về nghĩa khi keyword khác nhau; so ít nhất ba backend trên dữ liệu SocialBackEnd.

<details><summary>Tiêu chí POC</summary>
Recall@K/relevance, filter support, p95, update/delete, index build, memory, backup, multi-tenancy và cost. Hybrid BM25+vector thường là baseline mạnh hơn vector-only.
</details>

### [AI-04] Embedding lifecycle

**L4 · Data pipeline · model version, backfill**

**Đề bài:** đổi embedding model/dimension mà search không downtime; post edit/delete phải cập nhật đúng version.

<details><summary>Gợi ý</summary>
Lưu model id, content hash, generated time và vector status. Dual index/column, backfill bounded, shadow query, alias cutover và rollback. Không overwrite vector cũ trước khi đánh giá xong.
</details>

### [AI-05] Hybrid search và reranking

**L4 · Information retrieval · fusion, reranker**

**Đề bài:** kết hợp lexical, semantic, freshness và social signals; optional cross-encoder reranker có cost cao.

<details><summary>Gợi ý</summary>
Candidate từ nhiều retriever, RRF/weighted fusion rồi rerank top N. Timeout budget/fallback, feature normalization, experiment version và relevance/offline-online evaluation.
</details>

### [AI-06] AI moderation nhiều tầng

**L4 · Safety workflow · rules, model, human review**

**Đề bài:** phân loại spam, harassment, self-harm và nội dung nhạy cảm; action khác nhau theo confidence/category.

<details><summary>Gợi ý</summary>
Rule nhanh → model → review queue; lưu model/policy version, score và evidence tối thiểu. Không lưu raw sensitive content quá retention; appeal, false positive và emergency override.
</details>

### [AI-07] Prompt injection qua bài viết

**L4 · LLM security · untrusted content, tool boundary**

**Đề bài:** Gemini tóm tắt post chứa chỉ dẫn độc hại nhằm lấy secret hoặc gọi tool trái phép.

<details><summary>Gợi ý</summary>
Phân tách system instruction và untrusted data, không đưa secret vào context, allowlist tool/schema, output validation và least privilege. Red-team corpus và audit tool calls.
</details>

### [AI-08] Tóm tắt conversation tăng dần

**L4 · LLM + chat · incremental summary, version**

**Đề bài:** conversation dài vượt context window; summary phải cập nhật khi có message mới, edit/delete và không lộ message user không còn quyền xem.

<details><summary>Gợi ý</summary>
Summary theo segment/high-water sequence, source message range, prompt/model version. Invalidated/rebuild khi edit; permission scope và encrypted sensitive data. Đánh giá factuality bằng test set.
</details>

### [AI-09] RAG hỏi đáp nội quy community

**L4 · RAG · chunking, citation, ACL**

**Đề bài:** trả lời từ rule/version/moderator guide, phải dẫn nguồn và không dùng version chưa publish.

<details><summary>Gợi ý</summary>
Ingestion theo document version/effective time, chunk metadata/ACL, hybrid retrieval và quote bounds. Nếu không đủ evidence phải từ chối; đánh giá retrieval và groundedness riêng.
</details>

### [AI-10] Chống duplicate/near-duplicate content

**L4 · Similarity · MinHash/vector/image hash**

**Đề bài:** phát hiện repost text/image chỉnh nhẹ ở quy mô lớn, nhưng quote hợp lệ không bị chặn.

<details><summary>Gợi ý</summary>
Exact hash, normalized text fingerprint, perceptual image hash và embedding theo cascade. Candidate index, threshold theo language/content type, human review và appeal.
</details>

### [AI-11] AI-generated content provenance

**L3 · Metadata/governance · disclosure**

**Đề bài:** ghi content được AI hỗ trợ, model/prompt template version và user edit; không lưu prompt chứa PII vô hạn.

<details><summary>Gợi ý</summary>
Provenance metadata tách khỏi public disclosure policy. Hash/template id thay raw prompt khi đủ; audit consent, retention và export/delete.
</details>

### [AI-12] Model routing và fallback

**L4 · Resilience/cost · timeout, circuit breaker**

**Đề bài:** route request theo loại task, latency/cost/safety; provider chậm hoặc quota hết vẫn có degraded mode.

<details><summary>Gợi ý</summary>
Deadline chung, per-model budget, circuit breaker/bulkhead, deterministic fallback và cache hợp lệ theo content hash/model version. Metric cost, token, error, safety và quality.
</details>

### [AI-13] Streaming response và cancellation

**L3 · ASP.NET Core · streaming, backpressure**

**Đề bài:** stream AI output đến client; client disconnect phải cancel upstream, không giữ connection/resource vô hạn.

<details><summary>Gợi ý</summary>
Truyền `RequestAborted`, bounded buffer, timeout, partial output status và billing metric. Không persist nội dung incomplete như completed answer.
</details>

### [AI-14] Vector privacy và xóa dữ liệu

**L4 · Privacy · derived data deletion**

**Đề bài:** user xóa post/account; embedding, cache, ANN index, backup và training dataset phải xử lý theo policy.

<details><summary>Gợi ý</summary>
Lineage từ source id→mọi derivative, tombstone event, delete/rebuild/reconciliation. Đánh giá membership inference và không coi embedding là dữ liệu vô danh mặc định.
</details>

### [AI-15] Evaluation gate trước production

**L5 · LLMOps · quality, safety, cost**

**Đề bài:** tạo pipeline chặn rollout prompt/model mới nếu chất lượng hoặc safety giảm.

<details><summary>Tiêu chí hoàn thành</summary>
Versioned golden/red-team sets, offline score, human rubric, latency/cost budgets, shadow/canary và rollback. Production feedback không được tự động biến thành training truth chưa kiểm duyệt.
</details>

### [AI-16] AI incident runbook

**L5 · Operations · harmful output, provider outage**

**Đề bài:** model bắt đầu trả nội dung nguy hiểm hoặc sai hàng loạt sau provider update. Thiết kế phát hiện và phản ứng trong 15 phút.

<details><summary>Gợi ý</summary>
Kill switch theo feature/model, fallback/template, trace version, sampling an toàn, user report escalation và preserve evidence. Xác định owner, severity, communication và post-incident regression set.
</details>
