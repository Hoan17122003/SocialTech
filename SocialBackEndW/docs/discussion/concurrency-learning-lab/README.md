# Phòng thực hành C#/.NET về Concurrency và Backend Engineering

> Bộ bài tự học theo cách “học bằng thiết kế, đo đạc, chủ động tạo lỗi và sửa lỗi”. Không đọc lời giải trước khi tự viết giả thuyết, test và benchmark.

Toàn bộ phần diễn giải trong bộ tài liệu sử dụng tiếng Việt. Các keyword, tên API, pattern và thuật ngữ chuyên ngành như `Task`, `ThreadPool`, `race condition`, `backpressure`, `outbox`, `Kafka` được giữ nguyên để bảo toàn context kỹ thuật và thuận tiện khi tra cứu.

## Mục tiêu

Bộ bài thực hành này rèn tư duy từ Junior đến Middle và mức sẵn sàng tiến tới Senior về process, thread, async, concurrency, parallelism, race condition, deadlock, hiệu năng, ASP.NET Core, database, file, streaming, batch, Kafka và distributed systems. Các bài toán được gắn với SocialBackEnd: community membership, vote, notification, chat, media, cache, Kafka, Cassandra, Elasticsearch và email.

## Bản đồ tài liệu

1. [01-senior-problem-solving-playbook.md](01-senior-problem-solving-playbook.md): khung tư duy và mẫu ghi chép bắt buộc.
2. [02-process-thread-async-labs.md](02-process-thread-async-labs.md): process, thread, ThreadPool, Task, async/await, cancellation.
3. [03-concurrency-race-deadlock-labs.md](03-concurrency-race-deadlock-labs.md): race, lock, deadlock, starvation, concurrent collections.
4. [04-parallelism-performance-labs.md](04-parallelism-performance-labs.md): CPU/I/O-bound, parallelism, allocation, benchmark, backpressure.
5. [05-aspnet-core-production-labs.md](05-aspnet-core-production-labs.md): request lifecycle, DI lifetime, background worker, resilience, observability.
6. [06-database-cache-consistency-labs.md](06-database-cache-consistency-labs.md): transaction, isolation, optimistic concurrency, cache, idempotency.
7. [07-file-streaming-batch-labs.md](07-file-streaming-batch-labs.md): file lớn, upload/download, pipeline, CSV, batch và checkpoint.
8. [08-kafka-distributed-systems-labs.md](08-kafka-distributed-systems-labs.md): partition, consumer group, ordering, retry, outbox, saga.
9. [09-capstone-interview-roadmap.md](09-capstone-interview-roadmap.md): đồ án tổng hợp, lịch học và bộ câu hỏi phỏng vấn.
10. [10-database-feature-design-challenges.md](10-database-feature-design-challenges.md): đề bài tính năng mới để tự chọn công nghệ, thiết kế database và luồng nghiệp vụ.

Tài liệu hiện hữu nên đọc kèm: `KafkaAndBasicKnowledge.md`, `Kafka-dicussion.md`, `ASP.NET-Core-File-Stream-Handbook.md`, `ASP.NET-Core-Startup-Lifecycle.md`, `EntityFramework-discussion.md`, `cache-discussion.md` và nhóm tài liệu realtime/chat trong cùng thư mục.

## Luật làm lab

Với mỗi bài, tạo thư mục riêng gồm `README.md`, code, test và kết quả đo. Trước khi code phải ghi: giả thuyết, invariants, failure modes, mức tải, giới hạn tài nguyên và tiêu chí thành công. Sau khi code phải có: test tái hiện lỗi, số đo trước/sau, điều còn chưa biết và quyết định kỹ thuật.

Không dùng `Thread.Sleep` để “hy vọng” đồng bộ; dùng barrier/gate có chủ đích trong test. Không kết luận “nhanh hơn” nếu chưa benchmark. Không kết luận “thread-safe” nếu chưa nêu invariant. Không gọi giải pháp “exactly-once” nếu chưa định nghĩa phạm vi side effect.

## Thang đánh giá

- **Junior:** code chạy đúng luồng thông thường, giải thích được API đang dùng.
- **Middle:** xử lý cancellation, timeout, lỗi, tải đồng thời; có test và metrics.
- **Sẵn sàng tiến tới Senior:** nêu trade-off, invariant, capacity, phương án khôi phục lỗi, rollout/rollback và chứng minh bằng dữ liệu.

## Tiêu chuẩn hoàn thành cho mỗi bài

- Có test đúng, test lỗi và test concurrent/recovery khi phù hợp.
- Không nuốt exception; cancellation được truyền xuyên suốt.
- Tài nguyên có giới hạn: queue, connection, memory, concurrency.
- Có structured log, correlation id và ít nhất một metric hữu ích.
- Có benchmark/load test nếu bài liên quan hiệu năng.
- README trả lời: tại sao chọn giải pháp, khi nào nó hỏng, phương án thay thế.
