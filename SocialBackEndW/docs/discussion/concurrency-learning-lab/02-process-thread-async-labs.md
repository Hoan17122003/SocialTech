# Process, Thread, Task và Async/Await — 24 lab

Mỗi bài thực hành làm 3 vòng: bản đơn giản, bản chịu lỗi/cancellation và bản có đo đạc. Ký hiệu J/M/S tương ứng với độ khó Junior, Middle và mức sẵn sàng tiến tới Senior.

## A. Nền tảng runtime

1. **J — Process inspector:** CLI in PID, thread count, working set, GC heap mỗi giây. Gợi ý: `Process`, `Environment`, `dotnet-counters`; phân biệt OS process và managed runtime.
2. **J — Thread identity:** chạy 100 work item, ghi managed thread id trước/sau `await`. Giải thích vì sao Task không phải Thread và continuation không buộc về thread cũ.
3. **J — Minh họa context switch:** so sánh 1, 10 và 1.000 dedicated thread cho công việc nhỏ. Đo thời gian/memory; giải thích oversubscription.
4. **M — Child process runner:** chạy tool ngoài, stream stdout/stderr, timeout và kill process tree. Tránh deadlock vì đọc tuần tự hai stream.
5. **M — Graceful shutdown:** console worker nhận Ctrl+C, dừng nhận việc, drain queue, flush và thoát trong deadline.
6. **S — Crash supervisor:** parent giám sát child, restart có backoff/jitter, circuit breaker khi crash loop, health signal và log nguyên nhân.

## B. ThreadPool và Task scheduling

7. **J — ThreadPool starvation lab:** đặt blocking calls vào request giả lập rồi quan sát queue length/latency. Sửa bằng async end-to-end; không chỉ tăng min threads.
8. **J — `Task.Run` đúng/sai:** thử CPU-bound và I/O-bound. Viết rule khi nào API server không nên bọc I/O async bằng `Task.Run`.
9. **M — Scheduler giới hạn:** xử lý 10.000 jobs với concurrency N bằng `SemaphoreSlim`; luôn release trong `finally`; đo N tối ưu.
10. **M — Công việc chạy lâu:** so sánh `TaskCreationOptions.LongRunning`, Thread và ThreadPool. Nêu chi phí và trường hợp hiếm cần dùng.
11. **M — Exception aggregation:** chạy fan-out, quyết định fail-fast hay collect-all; giữ stack trace và map lỗi theo item.
12. **S — Fair work scheduler:** ưu tiên notification quan trọng nhưng không làm starvation job thường; thiết kế weighted queues và metric lag.

## C. Async/await và cancellation

13. **J — Async breakfast nâng cấp:** các bước phụ thuộc/độc lập; vẽ DAG rồi dùng `Task.WhenAll`; so latency tuần tự/song song.
14. **J — Cancellation propagation:** API giả lập → service → repository → HTTP/DB delay. Không tạo token mới làm đứt chuỗi.
15. **M — Timeout budget:** request có 2 giây cho ba dependency. Phân bổ budget từ deadline chung thay vì mỗi call 2 giây.
16. **M — Async disposal:** stream/file/network resource với `await using`; chứng minh cleanup xảy ra khi exception/cancel.
17. **M — `IAsyncEnumerable`:** phát 1 triệu record có cancellation; consumer chậm; so memory với trả về `List<T>`.
18. **M — Async-over-sync trap:** tái hiện `.Result`/`.Wait()` gây starvation hoặc deadlock trong custom `SynchronizationContext`; sửa async-all-the-way.
19. **M — `TaskCompletionSource`:** biến callback API thành Task; xử lý callback nhiều lần, timeout, cancellation; cân nhắc `RunContinuationsAsynchronously`.
20. **S — Hedged request:** gửi request thứ hai khi percentile chậm; lấy kết quả đầu, cancel phần còn lại; phân tích tăng tải và chỉ dùng cho idempotent read.

## D. Áp dụng SocialBackEnd

21. **M — Profile aggregator:** song song hóa lấy user, follower count, recent posts, avatar URL; partial result hay fail toàn bộ phải có quyết định.
22. **M — Media metadata:** nhận nhiều file, đọc metadata với bounded concurrency; giới hạn tổng bytes, timeout và cancellation khi client disconnect.
23. **S — Chat fan-out:** lưu message là critical path; indexing, summary, notification là side effect. Chọn await, queue in-memory hay Kafka và nêu durability.
24. **S — Request coalescing:** 1.000 request cùng cache miss chỉ cho một lần load DB; xử lý lỗi, cancellation từng caller và dọn entry.

## Câu hỏi phỏng vấn phải tự trả lời

- Process, OS thread, managed thread, ThreadPool work item và Task khác nhau thế nào?
- `async` có tạo thread mới không? Khi nào code sau `await` chạy synchronously?
- `Task.WhenAll` khác chạy tuần tự ở exception, cancellation và latency thế nào?
- Vì sao unbounded parallelism thường làm hệ thống chậm hơn?
- Cancellation trong .NET là cooperative; điều đó ảnh hưởng contract ra sao?
- ThreadPool starvation biểu hiện gì và phân biệt với CPU saturation thế nào?
