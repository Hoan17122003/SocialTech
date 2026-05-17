# Tài liệu loading của hệ thống hiện tại

## 1. Mục tiêu tài liệu

Tài liệu này mô tả đầy đủ cách hệ thống frontend hiện tại đang xử lý loading, bao gồm:

- Loading toàn cục khi gọi API.
- Loading cục bộ trong từng form hoặc hành động cụ thể.
- Loading khi lazy-load component nặng ở phía client.
- Phần loading theo chuẩn App Router của Next.js đang có hoặc chưa có.

Mục tiêu là để khi đọc tài liệu này, người mới vào dự án có thể hiểu:

- Vì sao người dùng thấy màn hình loading.
- Loading được bật ở đâu, tắt ở đâu.
- Những file nào đang tham gia vào cơ chế đó.
- Giới hạn của kiến trúc loading hiện tại.
- Cần bổ sung gì nếu muốn loading đồng bộ hơn trong tương lai.

---

## 2. Kết luận nhanh

Hiện tại dự án đang có 3 tầng loading chính:

### 2.1 Loading toàn cục theo request API

- Được kích hoạt trong `http-client`.
- Hiển thị bằng một overlay phủ toàn màn hình.
- Áp dụng mặc định cho gần như mọi request dùng `httpClient`.

### 2.2 Loading cục bộ theo từng màn hình hoặc form

- Dùng state như `isSubmitting`.
- Thường chỉ khóa nút bấm, đổi label nút và ngăn submit trùng.
- Không thay thế loading toàn cục, mà hoạt động song song với nó.

### 2.3 Loading khi tải component động ở client

- Đang có ở màn hình tạo bài viết, khi lazy-load Markdown editor bằng `next/dynamic`.
- Người dùng sẽ thấy placeholder nhẹ trong lúc editor chưa tải xong.

Điểm quan trọng:

- Dự án hiện chưa dùng file `loading.tsx` của App Router cho từng route segment.
- Nghĩa là loading của hệ thống hiện tại chủ yếu là loading ở tầng client và API, chưa phải loading điều hướng theo chuẩn route-level của Next.js.

---

## 3. Cơ chế loading toàn cục đang hoạt động như thế nào

Đây là cơ chế loading quan trọng nhất của hệ thống hiện tại.

### 3.1 Các file tham gia

- `src/shared/ui/global-loading-store.ts`
- `src/shared/ui/global-loading-overlay.tsx`
- `src/shared/api/http-client.ts`
- `src/providers/app-provider.tsx`
- `src/app/layout.tsx`

### 3.2 Vai trò từng file

#### `src/shared/ui/global-loading-store.ts`

File này là nơi giữ số lượng request đang chạy.

Nó không dùng Redux, Zustand hay Context phức tạp, mà dùng một store rất gọn:

- `activeRequests`: đếm số request đang còn mở.
- `listeners`: danh sách hàm cần được báo khi state loading thay đổi.
- `start()`: tăng bộ đếm lên 1.
- `stop()`: giảm bộ đếm xuống 1 nhưng không cho âm.
- `subscribe()`: cho component UI đăng ký lắng nghe thay đổi.
- `getSnapshot()`: trả về số request hiện tại.

Hiểu đơn giản:

- Nếu `activeRequests = 0` thì không loading.
- Nếu `activeRequests > 0` thì đang có ít nhất một request và overlay phải hiện ra.

#### `src/shared/ui/global-loading-overlay.tsx`

Đây là component hiển thị loading ra giao diện.

Nó dùng `useSyncExternalStore(...)` để đọc state từ `globalLoadingStore`.

Luồng hoạt động:

1. Component subscribe vào store.
2. Mỗi lần `activeRequests` đổi, component render lại.
3. Nếu số request nhỏ hơn 1 thì trả về `null`.
4. Nếu số request lớn hơn hoặc bằng 1 thì render overlay toàn màn hình.

Overlay hiện tại có các đặc điểm:

- Dùng `position: fixed` phủ toàn bộ viewport.
- Có `backdrop-blur` để làm mờ nền phía sau.
- Có spinner ở giữa.
- Có thông điệp giải thích rằng hệ thống đang xử lý dữ liệu và tạm khóa tương tác.

#### `src/shared/api/http-client.ts`

Đây là nơi loading toàn cục được bật và tắt.

Trong hàm `request(...)`, hệ thống có option:

```ts
showGlobalLoading?: boolean;
```

Mặc định:

```ts
showGlobalLoading = true
```

Nghĩa là:

- Nếu gọi API qua `httpClient.get/post/put/delete(...)` mà không truyền cấu hình gì thêm, request đó sẽ tự bật loading toàn cục.

Luồng chính:

1. Trước khi `fetch`, nếu `showGlobalLoading` là `true` thì gọi `globalLoadingStore.start()`.
2. Thực hiện request.
3. Dù request thành công hay lỗi, khối `finally` vẫn chạy.
4. Trong `finally`, nếu `showGlobalLoading` là `true` thì gọi `globalLoadingStore.stop()`.

Điểm hay của cách này:

- Không sợ quên tắt loading ở các luồng lỗi.
- Nếu có nhiều request chạy song song, bộ đếm vẫn đúng.
- Overlay chỉ biến mất khi request cuối cùng hoàn tất.

#### `src/providers/app-provider.tsx`

File này mount `GlobalLoadingOverlay` ở cấp cao của ứng dụng:

```tsx
<AuthProvider>
    {children}
    <GlobalLoadingOverlay />
</AuthProvider>
```

Điều đó có nghĩa:

- Bất kỳ page nào nằm trong `AppProvider` đều có thể dùng chung loading toàn cục.
- Không cần nhúng loading lại ở từng màn hình.

#### `src/app/layout.tsx`

`RootLayout` wrap toàn bộ app bằng `AppProvider`, nên cơ chế loading toàn cục có hiệu lực cho gần như toàn bộ hệ thống.

---

## 4. Luồng chạy thực tế của loading toàn cục

Ví dụ người dùng bấm nút đăng nhập:

1. `login-form.tsx` gọi `authApi.login(...)`.
2. `authApi.login(...)` gọi `httpClient.post(...)`.
3. `http-client.ts` thấy `showGlobalLoading` mặc định là `true`.
4. `globalLoadingStore.start()` được gọi.
5. `GlobalLoadingOverlay` render ra màn hình.
6. Request được gửi đến backend.
7. Khi request hoàn tất hoặc bị lỗi, `finally` chạy.
8. `globalLoadingStore.stop()` được gọi.
9. Nếu không còn request nào khác, overlay biến mất.

Nếu có 2 request chạy cùng lúc:

1. Request A gọi `start()` làm bộ đếm thành `1`.
2. Request B gọi `start()` làm bộ đếm thành `2`.
3. Request A xong trước, `stop()` làm bộ đếm còn `1`.
4. Overlay vẫn còn.
5. Request B xong sau, `stop()` làm bộ đếm còn `0`.
6. Overlay mới biến mất.

Đây là lý do hệ thống không bị hiện tượng loading tắt quá sớm khi nhiều request cùng chạy.

---

## 5. Những API nào đang tự dùng loading toàn cục

Vì các module dưới đây đều gọi qua `httpClient`, nên mặc định chúng đều bật loading toàn cục:

### 5.1 Nhóm xác thực

- `src/features/auth/auth-api.ts`
  - `login(...)`
  - `logout()`
  - `register(...)`

### 5.2 Nhóm người dùng

- `src/features/users/users-api.ts`
  - `getProfile(...)`
  - `updateProfile(...)`
  - `forgotPassword(...)`
  - `resetForgotPassword(...)`
  - `follow(...)`
  - `unfollow(...)`
  - `getFollowers(...)`

### 5.3 Nhóm bài viết

- `src/features/articles/articles-api.ts`
  - `create(...)`
  - `getDetail(...)`
  - `update(...)`
  - `remove(...)`

Nói ngắn gọn:

- Nếu sau này team thêm API mới và vẫn đi qua `httpClient`, loading toàn cục sẽ tự hoạt động mà không cần viết thêm gì.

---

## 6. Loading cục bộ ở từng màn hình đang được dùng ra sao

Ngoài overlay toàn cục, nhiều màn hình còn có loading cục bộ bằng `isSubmitting`.

Mục đích của tầng này không phải để thay thế overlay, mà để:

- Khóa nút submit.
- Đổi text nút sang trạng thái đang xử lý.
- Ngăn người dùng bấm lặp.
- Truyền tín hiệu rõ ràng hơn ở đúng vị trí tương tác.

### 6.1 Đăng nhập

File:

- `src/features/auth/components/login-form.tsx`

Cách dùng:

- Có `const [isSubmitting, setIsSubmitting] = useState(false)`.
- Khi submit, state này được bật lên.
- Nút chuyển text sang `Đang xử lý...`.
- Nút bị disable trong lúc request đang chạy.

### 6.2 Đăng ký

File:

- `src/features/auth/components/register-form.tsx`

Cách dùng:

- Có `isSubmitting`.
- Nút đổi từ `Tạo tài khoản` sang `Đang tạo...`.

### 6.3 Cập nhật hồ sơ

File:

- `src/features/users/components/profile-panel.tsx`

Cách dùng:

- Có `isSubmitting`.
- Nút đổi từ `Lưu thay đổi` sang `Đang cập nhật...`.

### 6.4 Đặt lại mật khẩu

File:

- `src/app/(user)/forgetpassword-validate/[token]/page.tsx`

Cách dùng:

- Có `isSubmitting`.
- Nút đổi từ `Xác nhận đổi mật khẩu` sang `Đang cập nhật...`.

### 6.5 Tạo bài viết

File:

- `src/features/articles/components/article-composer.tsx`

Cách dùng:

- Có `isSubmitting`.
- Form có `aria-busy={isSubmitting}`.
- Nút submit đổi text sang `Đang gửi...`.
- Nút reset cũng bị disable để tránh người dùng thao tác khi request chưa xong.

### 6.6 Ý nghĩa kiến trúc của tầng loading này

Loading cục bộ giúp trải nghiệm rõ ràng hơn vì:

- Người dùng nhìn ngay vào nút mình vừa bấm sẽ thấy phản hồi.
- Có thể giữ nguyên bố cục màn hình thay vì chỉ dựa vào overlay toàn cục.
- Dễ thêm logic riêng từng form như chặn submit lặp, đổi thông báo, hiển thị lỗi tại chỗ.

Tuy nhiên cần nhớ:

- `isSubmitting` chỉ kiểm soát UI cục bộ.
- Overlay toàn cục vẫn đang được bật cùng lúc nếu request đó đi qua `httpClient`.

Nói cách khác:

- Một hành động submit hiện tại thường có cả loading cục bộ lẫn loading toàn cục.

---

## 7. Loading khi lazy-load component nặng

Hiện tại dự án đang có ít nhất một chỗ dùng loading kiểu này.

### 7.1 Vị trí đang dùng

File:

- `src/features/articles/components/article-composer.tsx`

Đoạn logic chính:

```tsx
const MarkdownEditor = dynamic(() => import('@uiw/react-md-editor'), {
    ssr: false,
    loading: () => <div>Đang tải Markdown editor...</div>,
});
```

### 7.2 Ý nghĩa

Đây là loading cho quá trình tải component JavaScript ở phía client, không phải loading API.

Nó giải quyết bài toán:

- Markdown editor khá nặng.
- Component này phụ thuộc môi trường browser.
- Không nên render SSR trực tiếp.

Vì vậy dự án dùng:

- `next/dynamic`
- `ssr: false`
- `loading: () => ...`

Khi người dùng mở màn hình tạo bài viết:

1. Page render trước.
2. Editor được tải động ở client.
3. Trong lúc editor chưa sẵn sàng, placeholder loading hiển thị.
4. Khi component tải xong, editor thật được thay vào.

### 7.3 Điểm khác với loading toàn cục

Loading kiểu này:

- Không phụ thuộc `httpClient`.
- Không làm hiện overlay toàn màn hình.
- Chỉ ảnh hưởng đúng vùng editor.

Đây là một loading theo component, rất phù hợp với các UI lớn hoặc thư viện nặng.

---

## 8. Trạng thái loading theo chuẩn Next.js App Router hiện tại

Theo tài liệu `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`, file `loading.tsx` trong App Router có vai trò:

- Tạo loading UI cho một route segment.
- Tự động bọc `page.tsx` và các route con trong một `Suspense boundary`.
- Hỗ trợ kiểu điều hướng có cảm giác tức thời hơn khi chuyển trang.

### 8.1 Dự án hiện tại đang ở trạng thái nào

Hiện tại source chưa có các file như:

- `src/app/loading.tsx`
- `src/app/(workspace)/loading.tsx`
- `src/app/(auth)/loading.tsx`
- Hoặc `loading.tsx` ở các route con khác

Điều đó có nghĩa:

- Hệ thống chưa tận dụng route-level loading mặc định của App Router.
- Khi điều hướng giữa các trang, trải nghiệm loading đang phụ thuộc chủ yếu vào:
  - loading của request dữ liệu phía client
  - loading cục bộ trong component
  - loading lazy của component động

### 8.2 Ảnh hưởng thực tế

Ưu điểm:

- Cách làm hiện tại đơn giản, dễ hiểu, dễ kiểm soát.
- Phù hợp khi phần lớn dữ liệu được lấy sau khi component client mount lên.

Hạn chế:

- Chưa có skeleton chuẩn cho từng route khi người dùng chuyển trang.
- Chưa tận dụng streaming và Suspense ở cấp route của Next.js.
- Trải nghiệm điều hướng có thể chưa “mượt theo chuẩn App Router” ở các màn hình lớn.

---

## 9. Cơ chế loading của `AuthProvider`

`src/providers/auth-provider.tsx` không dùng loading spinner riêng, nhưng có một trạng thái đáng chú ý là:

- `isHydrated`

Ý nghĩa:

- Provider dùng `useSyncExternalStore(...)` để biết khi nào app đã hydrate ở client.
- Trước khi hydrate xong, token từ `localStorage` chưa được đọc.

Đây chưa phải loading hiển thị ra UI, nhưng là một trạng thái nền liên quan đến việc “app đã sẵn sàng chưa”.

Nói rõ hơn:

- `isHydrated = false` không làm hiện spinner.
- Nó chỉ giúp logic auth tránh đọc `localStorage` quá sớm trong môi trường server render.

---

## 10. Những điểm mạnh của kiến trúc loading hiện tại

### 10.1 Có một nơi trung tâm để quản lý loading API

Ưu điểm lớn nhất là toàn bộ request dùng chung `httpClient`, nên loading toàn cục rất đồng nhất.

### 10.2 Hỗ trợ tốt cho nhiều request song song

Dùng bộ đếm `activeRequests` tốt hơn kiểu boolean đơn giản vì:

- Không bị tắt loading nhầm khi còn request khác đang chạy.

### 10.3 Tách loading theo đúng cấp độ

Hiện tại hệ thống đã có phân lớp khá rõ:

- Loading toàn cục cho request.
- Loading cục bộ cho form.
- Loading theo component cho phần tải động.

### 10.4 Dễ mở rộng

Nếu sau này muốn một request không hiện overlay, chỉ cần truyền:

```ts
showGlobalLoading: false
```

Kiến trúc hiện tại đã chừa sẵn điểm mở rộng này.

---

## 11. Những giới hạn và rủi ro cần biết

### 11.1 Có thể bị “double feedback”

Vì vừa có overlay toàn cục vừa có `isSubmitting`, người dùng có thể thấy:

- Nút đổi trạng thái.
- Đồng thời cả màn hình bị phủ loading.

Điều này không sai, nhưng nếu lạm dụng sẽ làm UI hơi nặng tay.

### 11.2 Overlay toàn cục đang áp dụng rất rộng

Vì `showGlobalLoading` mặc định là `true`, gần như request nào cũng bật overlay.

Rủi ro:

- Những request nhỏ như refresh danh sách ngắn, follow/unfollow hoặc polling sau này có thể gây cảm giác bị chặn toàn màn hình quá thường xuyên.

### 11.3 Chưa có route loading theo chuẩn `loading.tsx`

Điều này khiến dự án chưa khai thác hết lợi thế của Next App Router cho chuyển trang và streaming UI.

### 11.4 Chưa phân loại loading theo mức độ quan trọng

Hiện tại loading API chủ yếu là một loại overlay chung. Hệ thống chưa phân biệt rõ:

- loading chặn toàn màn hình
- loading nhẹ theo section
- loading nền không chặn thao tác

---

## 12. Định hướng mở rộng nên cân nhắc

### 12.1 Bổ sung `loading.tsx` cho các route chính

Ưu tiên nên cân nhắc:

- `src/app/(workspace)/loading.tsx`
- `src/app/(auth)/loading.tsx`
- `src/app/(workspace)/articles/[id]/loading.tsx`

Mục tiêu:

- Có skeleton theo từng màn hình.
- Tận dụng đúng cơ chế route loading của Next.js.

### 12.2 Phân cấp request nào cần overlay, request nào không

Ví dụ:

- Submit form quan trọng: giữ overlay toàn cục.
- Tác vụ nhỏ như follow/unfollow: có thể chỉ dùng loading ở nút.
- Refresh danh sách nền: có thể tắt `showGlobalLoading`.

### 12.3 Bổ sung loading theo section

Thay vì lúc nào cũng khóa toàn bộ màn hình, có thể thêm:

- skeleton cho panel hồ sơ
- skeleton cho chi tiết bài viết
- skeleton cho danh sách follower

### 12.4 Chuẩn hóa text loading

Hiện trong code đang tồn tại cả text có dấu và không dấu. Sau này nên thống nhất để tài liệu và UI đồng bộ hơn.

---

## 13. Tóm tắt cuối cùng

Hệ thống loading hiện tại của dự án đang xoay quanh `httpClient` và `GlobalLoadingOverlay`.

Đây là trục chính giúp toàn bộ request API có hành vi loading thống nhất. Bên cạnh đó, từng form vẫn có `isSubmitting` để tạo phản hồi cục bộ rõ ràng hơn, và một số component nặng như Markdown editor được lazy-load kèm placeholder riêng.

Tuy nhiên, dự án hiện chưa dùng `loading.tsx` của Next App Router, nên loading điều hướng theo route vẫn chưa được khai thác. Nếu muốn nâng trải nghiệm lên mức hoàn chỉnh hơn, hướng đi hợp lý nhất là kết hợp:

- loading toàn cục cho request quan trọng
- loading cục bộ cho hành động cụ thể
- route-level loading bằng `loading.tsx`
- skeleton theo từng vùng nội dung

Như vậy hệ thống sẽ vừa dễ maintain, vừa đúng với kiến trúc Next.js hiện đại, vừa cho trải nghiệm mượt hơn khi ứng dụng mở rộng.
