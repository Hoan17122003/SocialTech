# Xử lý file, Streaming và Batch Processing — 26 bài thực hành

## A. File I/O an toàn

1. **J — Copy file lớn:** buffer cố định, async read/write, progress và cancellation; memory không tăng theo file size.
2. **J — Atomic replace:** ghi temp, flush, rename; xử lý crash và cleanup orphan; lưu ý filesystem boundary.
3. **M — Concurrent append:** nhiều writer ghi audit log; tái hiện dòng xen kẽ, chọn single writer channel hoặc file lock.
4. **M — Tail file:** đọc dòng mới, rotation/truncate, partial line, encoding và backoff khi không có dữ liệu.
5. **M — Directory watcher:** `FileSystemWatcher` có duplicate/missed events; debounce rồi reconciliation scan.
6. **M — Secure extraction:** chống zip slip, zip bomb, quá nhiều entries và path normalization.

## B. Upload/download và streaming

7. **J — Stream download:** hỗ trợ range, content length/type, cancellation khi disconnect; không load toàn file.
8. **M — Multipart upload:** stream từng section, tổng byte limit, temp storage, checksum và cleanup khi fail.
9. **M — Direct-to-object-storage:** presigned upload, finalize API, ownership/size/checksum validation và orphan cleanup.
10. **M — Resumable upload:** chunk idempotent, bitmap/manifest, checksum, parallel chunks bounded và final assembly.
11. **M — Streaming hash:** vừa upload vừa SHA-256 và ghi storage; tránh đọc lần hai; xử lý sink fail khác thời điểm.
12. **S — Virus scan workflow:** quarantine → scan → publish; state machine, timeout, retry, user visibility và false positive.

## C. Streaming records

13. **J — CSV million rows:** `IAsyncEnumerable`, parse line-by-line, report line number lỗi, memory bounded.
14. **M — Robust CSV:** quoted newline/comma, encoding/BOM, culture và malformed policy; ưu tiên thư viện chuẩn sau khi hiểu edge cases.
15. **M — JSON stream:** NDJSON producer/consumer; incremental deserialize, cancellation và partial record cuối.
16. **M — Backpressured transform:** read→validate→enrich→write bằng bounded channels; stage concurrency và poison record.
17. **M — Merge sorted streams:** k-way merge file lớn với priority queue; memory O(k), stable ordering.
18. **S — Event-time windows:** tính count theo cửa sổ; late event, watermark, allowed lateness và correction.

## D. Batch jobs

19. **J — Chunked import:** đọc 1.000 rows/batch, transaction per batch, progress; phân biệt all-or-nothing và partial success.
20. **M — Checkpoint/resume:** lưu cursor sau commit; crash trước/sau checkpoint; không skip và chấp nhận dedupe.
21. **M — Parallel batch:** partition theo stable key, bounded workers; skew/hot partition và aggregate errors.
22. **M — Retry failed rows:** transient vs validation error; retry budget, dead-letter file và report cho người dùng.
23. **M — Scheduled reconciliation:** single active run, distributed lease + fencing hoặc idempotent partitions; catch-up khi bỏ lịch.
24. **S — Snapshot consistency:** export trong lúc data thay đổi; DB snapshot, high-water mark hoặc change log.
25. **S — External sort:** dữ liệu lớn hơn RAM; sorted runs + merge; disk capacity, temp cleanup và crash recovery.
26. **S — Backfill production:** throttle theo DB health, pause/resume, feature flag, progress metric, rollback và verification query.

## Phép tính bắt buộc

Trước khi làm: file size, average/max record, records/s, buffer size, queue depth, concurrency, DB batch limit, temp disk headroom. Ví dụ queue memory xấp xỉ `depth × average item retained bytes`; phải tính cả object overhead và buffers, sau đó đo thực tế.

## Chủ động tạo lỗi để kiểm chứng

Test disk full, permission denied, truncated input, invalid encoding, client disconnect, storage timeout, checksum mismatch, process crash giữa commit/checkpoint, duplicate chunk và restart sau deploy. Mỗi lỗi phải có trạng thái cuối dễ hiểu và cleanup/recovery rõ ràng.
