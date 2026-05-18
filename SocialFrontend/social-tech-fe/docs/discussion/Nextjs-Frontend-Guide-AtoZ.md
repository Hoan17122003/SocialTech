---
title: Next.js Frontend Guide (A–Z) — Kiến trúc, SSR/CSR/SSG, Server Components, Data Fetching, Best Practices
audience: frontend-dev
project: social-tech-fe
next_version: 16.2.6
bundler: turbopack
status: living-doc
---

# 0) Mục tiêu & cách đọc

Tài liệu này là “sổ tay Next.js cho FE dev”: giải thích **kiến trúc**, **thành phần**, **cách dùng**, **cách xử lý API**, **rendering strategy (SSR/CSR/SSG/ISR)**, và đặc biệt là **Server Components trong App Router**.

Điểm quan trọng:

- Dự án đang dùng **Next.js 16.2.6** và **App Router**.
- Repo có rule: “Next.js phiên bản này có breaking changes”. Khi bạn cần “API chính xác”, hãy ưu tiên đọc docs *đúng version* trong repo: `node_modules/next/dist/docs/`.

Bạn có thể đọc theo thứ tự, hoặc nhảy theo mục lục.

---

# 1) Next.js là gì (nhìn theo kiến trúc)

Next.js = React framework + router + rendering engine + compiler/bundler + fullstack primitives.

Một FE dev làm Next.js thường phải hiểu 2 “thế giới”:

1) **React UI**: component, hooks, state, forms, UX.
2) **Rendering & Data**: server/client boundary, caching, streaming, route segments, server actions (nếu dùng), API routes.

Trong App Router, Next.js tách rõ:

- **Server Components (RSC)**: chạy trên server, default trong `app/`.
- **Client Components**: chạy trên browser, phải có `'use client'`.

---

# 2) App Router: file-based routing trong `src/app/`

## 2.1 Cấu trúc route segment

Mỗi folder trong `src/app/` là một “segment”. Các file quan trọng:

- `layout.tsx`: layout bao quanh segment (có thể lồng nhiều cấp).
- `page.tsx`: nội dung page của segment.
- `loading.tsx`: UI loading cho segment (streaming-friendly).
- `error.tsx`: error boundary của segment.
- `not-found.tsx`: 404 của segment.

Ví dụ hình dung:

```
src/app
  layout.tsx        # root layout
  globals.css
  (auth)/
    login/
      page.tsx
  dashboard/
    layout.tsx
    page.tsx
    loading.tsx
```

## 2.2 Route groups `(group)`

Folder `(something)` không xuất hiện trên URL, chỉ dùng để nhóm route và áp layout riêng.

## 2.3 Dynamic route `[id]`

Ví dụ:

```
src/app/articles/[id]/page.tsx
```

URL: `/articles/123` → `params.id = "123"`.

---

# 3) Rendering strategies: SSR / CSR / SSG / ISR (đúng tư duy)

Nói đơn giản:

- **CSR**: render trên client (browser). Server chỉ trả HTML shell.
- **SSR**: server render HTML mỗi request (có thể stream), client hydrate.
- **SSG**: server build HTML trước tại build time (static).
- **ISR**: static nhưng có cơ chế revalidate theo thời gian/trigger.

Trong App Router, thay vì “bật SSR/SSG như Pages Router ngày xưa”, bạn nên tư duy theo:

- **Component chạy ở đâu?** (server vs client)
- **Dữ liệu fetch ở đâu?** (server fetch vs client fetch)
- **Cache policy** (có cache không, revalidate thế nào)

## 3.1 Khi nào chọn CSR?

Chọn CSR khi:

- UI phụ thuộc mạnh vào browser APIs (localStorage, media devices…)
- Dữ liệu “user-specific” cần token/cookie phía client và không muốn SSR
- Không cần SEO / initial HTML không quan trọng

CSR thường đi cùng:

- client component + `useEffect` fetch
- show skeleton/loader
- handle error trong UI

## 3.2 Khi nào chọn SSR?

Chọn SSR khi:

- SEO quan trọng
- cần render HTML có dữ liệu ngay lần đầu (fast first content)
- dữ liệu phụ thuộc cookie/session server-side

Trong App Router, SSR thường là:

- server component fetch dữ liệu (không cần `'use client'`)
- Next stream HTML + hydrate phần client component con

## 3.3 Khi nào chọn SSG/ISR?

Chọn SSG/ISR khi:

- dữ liệu ít thay đổi, nhiều người xem giống nhau (marketing page, docs…)
- muốn tối ưu tốc độ & giảm tải server

Bạn sẽ cần:

- `generateStaticParams` (cho dynamic routes)
- thiết kế cache/revalidate phù hợp (theo docs version dự án)

> Vì caching semantics trong các version Next có thể thay đổi, hãy đọc `node_modules/next/dist/docs/` để áp dụng đúng flags/exports.

---

# 4) Server Components (RSC) trong Next.js: hiểu đúng để không “mơ hồ”

## 4.1 Server Component là gì?

Server Component:

- chạy trên server
- có thể truy cập server resources (DB, secrets) nếu bạn code như fullstack
- gửi “kết quả render” xuống client dưới dạng RSC payload (không ship toàn bộ code xuống browser)

Điều FE dev cần nhớ:

- Server Component **không được** dùng các hooks client như `useState`, `useEffect`.
- Server Component **không** gắn event handlers trực tiếp (onClick, onChange) vì event chạy ở client.

## 4.2 Client Component là gì?

Client component:

- chạy ở browser
- dùng hooks, event handlers, browser APIs
- phải có `'use client'` ở đầu file (top-level)

Ví dụ:

```tsx
'use client';
import { useState } from 'react';

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked((v) => !v)}>{liked ? 'Liked' : 'Like'}</button>;
}
```

## 4.3 Pattern kết hợp server + client (thực tế nhất)

Một pattern phổ biến:

- Page/segment là server component → fetch data
- Truyền data xuống client component để tương tác

Pseudo:

```tsx
// server component
export default async function Page() {
  const data = await getData();
  return <ClientView initialData={data} />;
}
```

```tsx
// client component
'use client';
export function ClientView({ initialData }: { initialData: Data }) {
  // interactivity here
}
```

## 4.4 Streaming + `loading.tsx`

`loading.tsx` là cách “chuẩn Next” để hiển thị loading UI khi segment đang được stream.

Tư duy:

- `loading.tsx` không phải “spinners cho mọi thứ”
- nó là fallback UI khi server đang xử lý (đặc biệt khi có suspense boundaries)

---

# 5) Data fetching: gọi API lúc nào, gọi ở đâu?

Bạn có 3 nơi phổ biến để fetch:

1) **Server Component**: fetch trên server → tốt cho SSR/SEO
2) **Client Component**: fetch bằng `useEffect` → tốt cho user-specific + tương tác
3) **API route / server action**: server-side endpoint cho client gọi (tuỳ kiến trúc)

## 5.1 Fetch ở client (pattern chuẩn cho FE)

Checklist:

- pending state
- error state
- cancel/race handling nếu user gõ nhanh / route change
- không để promise unhandled (tránh dev overlay)

Ví dụ pattern “pending/error” cơ bản:

```tsx
'use client';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      setIsPending(true);
      setError(null);
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) throw new Error('Request failed');
        const payload = await res.json();
        if (!canceled) setUser(payload);
      } catch (e) {
        if (!canceled) setError('Không tải được thông tin user.');
      } finally {
        if (!canceled) setIsPending(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  if (isPending) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
```

## 5.2 Dùng API client trong dự án (httpClient + ApiError)

Trong dự án này, client-side gọi API được chuẩn hoá qua:

- `src/shared/api/http-client.ts`

Đặc điểm:

- throw `ApiError` khi response không OK
- có option `auth`, `retryOnUnauthorized`, `showGlobalLoading`

Best practice quan trọng:

- UI/hook gọi `httpClient` **phải catch** để không làm văng runtime overlay.

Ví dụ:

```ts
try {
  await httpClient.post('/api/Auth/logout', undefined, { auth: true });
} catch (e) {
  // show toast, hoặc best-effort cleanup
}
```

## 5.3 “Global Loading” — làm sao để không bị lỗi SSR?

Nếu bạn dùng external store + `useSyncExternalStore`, trong App Router (SSR) phải có `getServerSnapshot`.

Trong dự án:

- `src/shared/ui/global-loading-overlay.tsx` dùng `useSyncExternalStore(...)`
- `src/shared/ui/global-loading-store.ts` đã có `getServerSnapshot() { return 0 }`

Lý do:

- server render cần snapshot ổn định để không mismatch/hydration issues

---

# 6) Error handling chuẩn trong Next App Router

## 6.1 `error.tsx` theo segment

`error.tsx` là UI boundary cho lỗi phát sinh trong segment (server render hoặc client render tuỳ case).

Best practices:

- hiển thị message thân thiện
- có nút retry (nếu pattern hỗ trợ)
- log error theo môi trường (Sentry, console…)

## 6.2 Không để UI crash vì “throw trong event handler”

Quy tắc FE:

- “Event handler” là boundary cuối cùng → phải `try/catch`
- “best-effort cleanup” không được throw (logout, clear cache…)

## 6.3 401/refresh token: nơi xử lý hợp lý

Trong dự án, `httpClient` có logic:

- nếu 401 và `auth` + `retryOnUnauthorized` → refresh token rồi retry request

Đây là pattern tốt, nhưng:

- refresh fail thì request vẫn fail → UI cần handle
- đừng log token ra console trong production

---

# 7) SSR vs CSR trong thực tế: quyết định nhanh (decision table)

| Case | Gợi ý render | Gợi ý fetch |
|------|--------------|------------|
| Page public cần SEO (blog, landing) | SSR/SSG/ISR | Server component fetch |
| Page dashboard riêng user | CSR hoặc SSR có auth cookie | Client fetch hoặc server fetch dựa cookie |
| Form tương tác mạnh (editor) | CSR (client components) | Client fetch + optimistic UI |
| Data ít đổi, ai cũng giống nhau | SSG/ISR | build-time fetch + revalidate |
| Sensitive secrets | Server only | Server component/API route |

---

# 8) Performance kỹ thuật cho FE dev

## 8.1 Giảm JS bundle

- giữ nhiều component ở server (đừng `'use client'` cả page nếu không cần)
- tách phần tương tác thành client components nhỏ

## 8.2 Image optimization

ESLint warning thường gặp: dùng `<img>` trực tiếp.

Nếu phù hợp, ưu tiên `next/image` để:

- tự tối ưu kích thước
- lazy-load
- cải thiện LCP

## 8.3 Fonts

Nếu build môi trường offline/CI, `next/font/google` có thể fail.

Giải pháp “dứt điểm”:

- chuyển sang `next/font/local` + commit font files (hoặc dùng system font stack)

---

# 9) TailwindCSS v4 trong Next (lưu ý thực chiến)

Trong dự án:

- `src/app/globals.css` dùng `@import 'tailwindcss';`
- dùng CSS variables + `@theme inline` để map token

Best practices:

- dùng token (`bg-background`, `text-foreground`, …) thay vì hardcode
- import CSS thư viện (node_modules) ở `layout.tsx` (JS import) nếu CSS `@import` gây lỗi bundler

---

# 10) “Cheat sheet” (nhớ nhanh)

## Server component

- Default trong `app/`
- Không hooks client / không events
- Tốt cho SSR/SEO, giảm bundle

## Client component

- Có `'use client'`
- Dùng hooks, events
- Tương tác, editor, forms

## Loading

- `loading.tsx` cho segment
- global loading overlay khi cần “lock UI” cho mutation

## Error

- `error.tsx` cho segment boundary
- UI handlers phải catch lỗi API

---

# 11) Những lỗi phổ biến & cách tránh (đúc kết từ project)

## 11.1 CSS: “Can't resolve '@uiw/react-md-editor/markdown-editor.css'”

Nguyên nhân:

- import CSS từ `node_modules` bằng `@import` trong `globals.css` có thể không resolve đúng với pipeline hiện tại.

Fix:

- import CSS library trong `src/app/layout.tsx` (TS import), không import trong CSS.

## 11.2 Runtime: “Missing getServerSnapshot…”

Nguyên nhân:

- dùng `useSyncExternalStore` thiếu `getServerSnapshot` khi có SSR.

Fix:

- cung cấp `getServerSnapshot` và truyền 3 args.

## 11.3 Runtime: ApiError overlay khi gọi API

Nguyên nhân:

- `httpClient` throw `ApiError`, UI không catch.

Fix:

- catch ở UI/hook, show message; best-effort cho logout/cleanup.

---

# 12) Gợi ý quy trình làm feature (chuẩn FE + Next)

1) Xác định route/segment: có cần layout riêng không?
2) Xác định render strategy: SSR hay CSR? SEO có quan trọng không?
3) Xác định data ownership:
   - server fetch (public/SEO)
   - client fetch (user-specific/tương tác mạnh)
4) UI states:
   - loading (segment loading hoặc local)
   - empty state
   - error state
5) Mutation UX:
   - disable controls
   - optimistic update (nếu hợp)
   - global loading overlay nếu cần “lock UI”
6) Performance:
   - tối thiểu `'use client'`
   - dùng `next/image` nếu hợp
7) Debug:
   - check boundary server/client
   - check cache/revalidate semantics theo docs version

