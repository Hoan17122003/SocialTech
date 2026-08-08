# Parallelism và Performance Engineering — 24 lab

Nguyên tắc: correctness → measurement → bottleneck → một thay đổi → đo lại. Không dùng stopwatch một lần để kết luận.

## A. CPU-bound parallelism

1. **J — Hash files:** tính hash N buffers tuần tự, `Task.Run`, `Parallel.ForEach`; thay đổi core count/payload và giải thích scaling.
2. **J — Image transform giả lập:** pipeline decode/transform/encode; xác định stage CPU/I/O; tránh song song hóa toàn bộ mù quáng.
3. **M — Prime/search partitioning:** static partition so dynamic scheduling; quan sát load imbalance.
4. **M — PLINQ ordering:** so ordered/unordered, merge options và cancellation; chỉ ra overhead với tập nhỏ.
5. **M — False sharing:** nhiều thread cập nhật counters gần nhau; đo cache-line contention và thử local aggregation.
6. **S — SIMD/vectorization:** xử lý score array bằng loop thường và `Vector<T>`; benchmark, kiểm tra correctness/tail.

## B. Memory, allocation và GC

7. **J — Allocation profiler:** endpoint serialize response lớn; đo allocation/GC bằng counters và profiler.
8. **M — Pooling:** dùng `ArrayPool<byte>` cho buffer; `try/finally`, không leak dữ liệu nhạy cảm, benchmark trước/sau.
9. **M — Span parsing:** parse CSV/date/id bằng substring so `Span`; không hy sinh readability khi lợi ích nhỏ.
10. **M — LOH pressure:** tạo payload >85 KB lặp lại; quan sát Gen2/LOH, sửa bằng streaming/chunking/pooling.
11. **M — Cache memory budget:** ước lượng entry size × cardinality; eviction và size limit; chống key explosion.
12. **S — Retention leak:** event handler/background task giữ object; thu dump, tìm GC root, viết regression test/metric.

## C. Throughput, latency và backpressure

13. **J — Little’s Law:** đo throughput/latency/concurrency của dependency giả lập; kiểm chứng L = λW.
14. **M — Bounded pipeline:** 3 stage với `Channel<T>`, mỗi stage concurrency khác; tìm bottleneck và queue depth hợp lý.
15. **M — Tail latency:** dependency có 1% request rất chậm; báo p50/p95/p99 thay vì average; đặt timeout từ SLO.
16. **M — Load shedding:** khi queue đầy, trả 429/503 sớm; so với nhận hết rồi timeout hàng loạt.
17. **M — Adaptive batch:** gom item theo max size hoặc max wait; cân bằng latency/throughput.
18. **S — Coordinated omission:** viết load test open-loop và closed-loop; giải thích vì sao một kiểu che tail latency.

## D. Benchmark thực chiến

19. **J — BenchmarkDotNet:** so string concat, `StringBuilder`, interpolation theo input size; warmup và baseline.
20. **M — JSON:** so deserialize whole object và streaming reader; payload nhỏ/lớn, CPU/allocation.
21. **M — Repository query:** projection vs load entity graph; SQL, rows, round trips, tracking và index.
22. **M — Pagination:** OFFSET lớn so keyset; consistency khi có insert mới và API cursor.
23. **S — End-to-end budget:** chia 300 ms SLO cho middleware, DB, cache, network, serialization; trace để xác minh.
24. **S — Capacity plan:** với 500 RPS, p95 dependency 80 ms, 2 KB/request, tính in-flight, connection, bandwidth và headroom.

## Sản phẩm đầu ra bắt buộc

Mỗi tối ưu phải có baseline, môi trường, input distribution, số lần chạy, p50/p95/p99 hoặc mean/error khi thích hợp, CPU, allocation, GC, kết luận và ngưỡng mà kết luận đổi chiều. Nếu thay đổi làm code khó hơn, ghi rõ lợi ích định lượng bù complexity ra sao.
