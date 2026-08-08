# Social Graph, Recommendation và Geospatial

Mỗi đề phải bắt đầu từ user value và query pattern. Graph database, vector database hay PostGIS chỉ là ứng viên; baseline relational luôn phải được đánh giá trước.

### [GRAPH-01] Mutual friends/follows ở quy mô hiện tại

**L3 · MySQL · self-join, composite index**

**Đề bài:** trả mutual follows giữa hai user và top mutual cho suggestion. Thiết kế baseline MySQL sargable, bounded và không load collection vào memory.

<details><summary>Gợi ý</summary>
Chuẩn hóa directed edge, unique `(FollowerId,FollowedId)`, index hai chiều cần thiết. Dùng join/intersection trong DB, keyset pagination và cap result; đo celebrity skew.
</details>

### [GRAPH-02] People You May Know

**L4 · Recommendation · candidate generation, ranking**

**Đề bài:** gợi ý người dùng từ friend-of-friend, community chung, contact consent và tương tác; loại block/private/already-followed.

<details><summary>Gợi ý</summary>
Tách candidate generation, filtering, scoring và explanation. Batch/precompute cho active users, online fallback cho long tail; version algorithm và lưu impression để đánh giá.
</details>

### [GRAPH-03] Neo4j POC cho multi-hop graph

**L4 · Neo4j/MySQL · graph traversal**

**Đề bài:** so Neo4j với MySQL cho đường đi 2–4 hop, common communities và moderator relationship investigation.

<details><summary>Tiêu chí POC</summary>
Dữ liệu skew, update rate, p95, consistency lag, backup, cluster cost, Cypher maintainability và dual-write/CDC. Không chọn Neo4j nếu query cố định 1–2 hop đã tốt trên MySQL.
</details>

### [GRAPH-04] Block graph và permission closure

**L3 · Authorization · directed relationship**

**Đề bài:** block phải ngăn follow, DM, mention và content visibility theo policy; unblock không tự phục hồi quan hệ cũ.

<details><summary>Gợi ý</summary>
Xác định block một chiều/hai chiều theo từng feature. Transaction xóa/disable edges liên quan, permission cache invalidation và audit. Deny path ưu tiên consistency hơn suggestion graph.
</details>

### [GRAPH-05] Community recommendation

**L4 · Batch + online features · diversity**

**Đề bài:** gợi ý community từ interest, follows, location và activity; không tạo filter bubble hoặc lộ private membership.

<details><summary>Gợi ý</summary>
Candidate theo collaborative/content/popularity, rank rồi áp policy/diversity. Lưu model/rule version, impression/click/join và negative feedback; định nghĩa cold-start.
</details>

### [GRAPH-06] Reputation graph chống brigading

**L5 · Fraud graph · temporal edges**

**Đề bài:** phát hiện nhóm account cùng vote/report trong thời gian ngắn để thao túng nội dung nhưng không kết luận sai community hoạt động mạnh.

<details><summary>Gợi ý</summary>
Graph có edge temporal/weighted; feature gồm account age, overlap, burst, repeated targets. Tách detection score và enforcement review; audit model version, false positive và appeal.
</details>

### [GRAPH-07] Influence score có thể giải thích

**L4 · Graph analytics · PageRank alternatives**

**Đề bài:** xếp hạng contributor theo community, không để celebrity toàn cục thống trị và chống spam reaction.

<details><summary>Gợi ý</summary>
So weighted degree, time-decay, quality signals và personalized PageRank. Tính batch incremental, cap contribution cùng cluster và cung cấp explanation/rollback version.
</details>

### [GEO-01] Post gần vị trí user

**L3 · MySQL spatial/PostGIS · radius query**

**Đề bài:** tìm public posts trong bán kính, filter thời gian và privacy; cursor phải ổn định theo distance/time/id.

<details><summary>Gợi ý</summary>
So MySQL spatial index và PostGIS `geography`; bounding box trước exact distance. Không lưu/hiển thị precision vượt consent; chống pagination drift khi vị trí user đổi.
</details>

### [GEO-02] Community theo vùng hành chính

**L3 · Geospatial · point-in-polygon**

**Đề bài:** community áp dụng cho phường/quận/tỉnh, ranh giới có version; user tìm community chứa vị trí hiện tại.

<details><summary>Gợi ý</summary>
Polygon complexity, SRID, boundary version/effective time và overlapping areas. Precompute region id khi hợp lý nhưng phải có backfill khi polygon đổi.
</details>

### [GEO-03] Location privacy và làm mờ tọa độ

**L4 · Privacy · geohash, k-anonymity**

**Đề bài:** hiển thị “gần bạn” mà không lộ vị trí chính xác, đặc biệt với user ở vùng thưa.

<details><summary>Gợi ý</summary>
Giảm precision/geohash theo density, minimum cohort, delayed aggregation và retention ngắn. Threat-model inference từ nhiều query; raw location access phải audit.
</details>

### [GEO-04] Nearby realtime event

**L4 · Geo + streaming · moving subscriptions**

**Đề bài:** thông báo sự kiện công khai mới trong bán kính; user di chuyển, event volume cao và push có quota.

<details><summary>Gợi ý</summary>
Spatial cell partition, user subscription cell set, debounce movement và dedupe notification. So fan-out event→users với users→query; backpressure và privacy consent.
</details>

### [REC-01] Experiment A/B cho ranking

**L4 · Experimentation · deterministic assignment**

**Đề bài:** chia user ổn định vào variant, đo click/dwell/hide nhưng không sample ratio mismatch và không đổi variant giữa phiên.

<details><summary>Gợi ý</summary>
Hash subject+experiment salt, eligibility trước assignment, exposure event đúng lúc render. Metric guardrail, power/duration, bot/internal traffic và experiment version.
</details>

### [REC-02] Feedback loop và event schema

**L4 · Kafka/warehouse · impression, attribution**

**Đề bài:** click không có impression hoặc event duplicate/out-of-order làm sai training data. Thiết kế identity và attribution window.

<details><summary>Gợi ý</summary>
Stable request/feed/impression ids, event-time/ingestion-time, schema version và dedupe. Impression phải ghi candidate/ranker version; privacy delete xuyên raw/derived datasets.
</details>

### [REC-03] Cold-start cho user/content

**L3 · Product algorithm · fallback**

**Đề bài:** user mới chưa có lịch sử và post mới chưa có engagement vẫn cần cơ hội xuất hiện.

<details><summary>Gợi ý</summary>
Onboarding interests, contextual/popularity, exploration quota và content features. Tách cold-start strategy, đo coverage/diversity, chống spam lợi dụng freshness.
</details>

### [REC-04] Right to explanation và opt-out

**L4 · Governance · explainability**

**Đề bài:** user xem “vì sao tôi thấy nội dung này”, tắt personalization và xóa history dùng cho recommendation.

<details><summary>Gợi ý</summary>
Lưu reason code không nhạy cảm cạnh impression, policy/version và fallback chronological. Xóa raw signal, derived profile và cache; định nghĩa deadline hoàn tất/reconciliation.
</details>
