# Playbook tư duy giải quyết vấn đề như Senior

## 1. Luồng suy nghĩ 12 bước

1. **Đặt lại vấn đề:** Ai gặp vấn đề? Hành vi quan sát được là gì? Không nhầm symptom với root cause.
2. **Chốt contract:** Input/output, latency SLO, throughput, độ bền dữ liệu, consistency, ordering, security.
3. **Viết invariants:** Ví dụ “một user chỉ có một membership đang hoạt động”; “vote count không âm”.
4. **Vẽ đường đi dữ liệu:** caller → API → queue → DB/cache/broker → side effect; đánh dấu boundary và ownership.
5. **Phân loại workload:** CPU-bound, I/O-bound, memory-bound hay contention-bound; burst hay đều; payload bao nhiêu.
6. **Liệt kê failure modes:** timeout, partial failure, process crash, duplicate, out-of-order, retry storm, disk full, network partition.
7. **Ước lượng:** RPS, concurrency = throughput × latency, memory = item size × queue depth, partition count, connection count.
8. **Brainstorm ít nhất 3 phương án:** đơn giản nhất, cân bằng, tối ưu quy mô lớn. Ghi trade-off, không chọn theo cảm tính.
9. **Thiết kế kiểm chứng:** unit/integration/stress/chaos test; metric nào sẽ bác bỏ giả thuyết?
10. **Thực hiện lát cắt nhỏ:** correctness trước, rồi observability, sau đó mới tối ưu.
11. **Rollout an toàn:** feature flag, canary, migration tương thích ngược, rollback và kill switch.
12. **Post-check:** so SLO trước/sau; ghi debt, ngưỡng cần đổi kiến trúc và điều học được.

## 2. Mẫu design note bắt buộc

```md
# Tên bài toán
## Bối cảnh / Phạm vi không giải quyết
## Yêu cầu chức năng / SLO
## Giả định về workload và phép tính capacity
## Invariants và ownership
## Data/control-flow
## Các tình huống lỗi
## Các phương án A/B/C và trade-off
## Quyết định và lý do
## Concurrency model và resource bounds
## Data consistency / idempotency / ordering
## Bảo mật / quyền riêng tư
## Khả năng quan sát hệ thống
## Test, load test, chaos test
## Rollout / rollback
## Các câu hỏi chưa có kết luận
```

## 3. Bộ câu hỏi Senior luôn hỏi

- “Đúng” nghĩa là gì khi hai request đến cùng lúc?
- Dữ liệu nào là source of truth? Ai được quyền mutate?
- Nếu handler chạy lại 2 lần thì sao? Nếu chạy nửa chừng rồi crash?
- Queue có bounded không? Khi đầy thì block, drop, reject hay spill-to-disk?
- Timeout nằm ở đâu? Cancellation có thật sự tới I/O cuối cùng?
- Ordering cần toàn cục, theo user, theo conversation hay không cần?
- Lock bảo vệ invariant nào? Critical section có chứa I/O không?
- Retry có budget, jitter và phân loại transient/permanent không?
- Cardinality của metric/log có gây nổ chi phí không?
- Kết quả benchmark có warmup, baseline, percentile và môi trường cố định không?

## 4. Cách brainstorm có kỷ luật

Với mỗi bài, lập bảng: phương án; correctness; latency; throughput; memory; complexity; operability; cost; failure recovery. Luôn có baseline “làm đồng bộ, đơn giản”. Tối ưu chỉ được chấp nhận nếu số đo vượt baseline và complexity đáng giá.

## 5. Cách điều tra bug concurrency

Thu thập timeline và correlation id; thu hẹp shared mutable state; viết test deterministic bằng `Barrier`, `ManualResetEventSlim`, `TaskCompletionSource`; tăng xác suất lỗi bằng lặp lại và tải; chụp thread dump/counters; phát biểu một giả thuyết; thay đổi một biến; giữ regression test sau khi sửa.

## 6. Rubric tự review 0–3

Chấm từng mục tính đúng đắn, tính đơn giản, cancellation, giới hạn tài nguyên, khả năng chịu lỗi, observability, khả năng kiểm thử, bảo mật và khả năng triển khai: 0 chưa xem xét; 1 mới có luồng thông thường; 2 đã xử lý lỗi; 3 có bằng chứng đo/test và trade-off. Dưới 18/27 chưa nên gọi là sẵn sàng cho production.
