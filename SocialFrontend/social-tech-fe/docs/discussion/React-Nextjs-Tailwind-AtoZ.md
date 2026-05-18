---
title: React + Next.js (App Router) + TailwindCSS v4 — Học & Dùng từ A–Z (kèm ví dụ theo dự án)
project: social-tech-fe
next_version: 16.2.6
react_version: 19.2.4
tailwind_version: 4
status: living-doc
---

# Mục tiêu

Tài liệu “1 file” này giúp bạn:

- Học lại **React** một cách có hệ thống, kèm **best practices**.
- Hiểu và dùng **Next.js App Router** đúng cách trong dự án này (Next **16.2.6**, Turbopack).
- Dùng **TailwindCSS v4** theo “CSS-first + token” đang có ở `src/app/globals.css`.
- Nắm các **logic thực tế** hay gặp: auth, gọi API, loading toàn cục, xử lý lỗi không làm app văng overlay.
- Có các **custom hooks** mẫu để dùng trực tiếp trong dự án.

> Rule quan trọng của repo: “Next.js phiên bản này có breaking changes”. Khi bạn phân vân API nào đúng, ưu tiên đọc docs *đúng version* tại `node_modules/next/dist/docs/`.

---

# Mục lục

1. React A–Z
   - Component/JSX, render, state/props
   - Re-render vs re-mount
   - Events, forms, validation
   - Lists/keys, composition, lifting state
2. Hooks A–Z
   - `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`
   - `useSyncExternalStore` (SSR-safe)
3. Best practices “đinh”
   - Tránh crash UI do unhandled promise
   - Phân tầng: UI ↔ hooks ↔ API client
   - Error UX (toast/inline) thay vì dev overlay
4. Next.js App Router (Next 16.2.6)
   - `src/app` routing, `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`
   - Server Components vs Client Components
   - Import CSS đúng chỗ (đặc biệt CSS từ `node_modules`)
   - Fonts (offline/CI) và cách xử lý
5. TailwindCSS v4 (CSS-first)
   - `@import 'tailwindcss'`
   - `@theme inline` + token variables
   - Quy tắc dùng token để UI consistent
6. Custom hooks “thực chiến”
   - `useAsyncFn`, `useMounted`, `useDebouncedValue`, `useEvent`
   - `useApiErrorMessage` (map lỗi API sang message thân thiện)
7. Patterns theo dự án (social-tech-fe)
   - `httpClient` + `ApiError`
   - global loading overlay store
   - Auth provider + logout best-effort
8. Debug nhanh (những lỗi bạn đã gặp)
   - CSS `Can't resolve @uiw/...css`
   - `Missing getServerSnapshot`
   - `next/font/google` fail do network

---

# 1) React A–Z (nền tảng nhưng sát thực tế)

## 1.1 Component là gì?

Component là hàm nhận **props** và trả về UI (JSX).

```tsx
function Hello({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}
```

### Props vs State

- **Props**: dữ liệu “đi xuống” từ parent → child, child **không mutate** trực tiếp.
- **State**: dữ liệu thay đổi theo thời gian, nằm trong component (hoặc store/hook), đổi state → UI cập nhật.

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </button>
  );
}
```

> Best practice: khi state mới phụ thuộc state cũ, dùng functional update `setCount((c) => c + 1)` để tránh stale state.

## 1.2 Render, Re-render, Re-mount

- **Render**: React chạy function component để ra “React elements”.
- **Re-render**: chạy lại function component do state/props/context thay đổi.
- **Re-mount**: component bị unmount rồi mount lại (state reset). Thường do đổi `key`, đổi route segment, hoặc conditional render làm mất cây.

Vì sao quan trọng?

- Re-render là bình thường.
- Re-mount mới hay gây “mất state” khiến UX khó chịu.

## 1.3 List rendering & key

```tsx
items.map((item) => <Row key={item.id} item={item} />);
```

Không dùng `index` làm key nếu list có thể reorder/insert/delete. Key sai → re-mount không cần thiết.

## 1.4 Event handlers và lỗi runtime overlay

Trong Next dev mode, nếu bạn `throw`/promise reject trong event handler mà không `catch`, bạn có thể thấy overlay.

Bad:

```tsx
async function onClick() {
  await apiCall(); // nếu throw -> unhandled -> overlay
}
```

Good:

```tsx
async function onClick() {
  try {
    await apiCall();
  } catch (e) {
    // show toast / inline error
  }
}
```

> Quy tắc: **UI layer** (component) là nơi “đóng lại” lỗi để app không crash.

## 1.5 Forms thực tế: login form tối thiểu

Ví dụ client component đơn giản:

```tsx
'use client';

import { useState } from 'react';
import { authApi } from '@/features/auth/auth-api';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await authApi.login({ email, password });
      // redirect / update auth state...
    } catch (err) {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        className="w-full rounded-xl border border-[var(--line)] px-4 py-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        className="w-full rounded-xl border border-[var(--line)] px-4 py-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        type="password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={isPending}
        className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isPending ? 'Đang xử lý…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
```

Best practices:

- Disable submit khi pending.
- Render error rõ ràng (inline/toast).
- Không log token ra console trong production.

---

# 2) Hooks A–Z (đúng cách và đúng chỗ)

## 2.1 `useState`

Đừng mutate object/array:

```tsx
setUser((u) => ({ ...u, name: nextName }));
setItems((xs) => xs.filter((x) => x.id !== id));
```

## 2.2 `useEffect`

Dùng cho side effects (subscribe, timers, sync browser APIs).

Sai lầm hay gặp:

- Dùng effect để “tính toán” derived values.
- Thiếu dependency hoặc dependency sai → loop / stale closure.

## 2.3 `useMemo` / `useCallback`

Chỉ dùng khi có lý do:

- compute nặng
- cần stable reference khi truyền xuống child memoized

## 2.4 `useRef`

Giữ mutable value giữa các renders mà không trigger render:

```tsx
const latestValueRef = useRef(value);
latestValueRef.current = value;
```

## 2.5 `useContext`

Context phù hợp cho state “app-level” như auth, theme, locale.

Trong dự án:

- `src/providers/auth-provider.tsx` cung cấp auth context.

## 2.6 `useSyncExternalStore` (cực quan trọng trong SSR)

Nếu bạn có “store” ngoài React (event emitter), muốn React render theo store, dùng:

```ts
useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

Nếu app có SSR (Next App Router), **bắt buộc** có `getServerSnapshot`, nếu không sẽ gặp lỗi runtime:

> Missing getServerSnapshot, which is required for server-rendered content…

Trong dự án:

- Store: `src/shared/ui/global-loading-store.ts`
- UI: `src/shared/ui/global-loading-overlay.tsx`

---

# 3) Best practices “đinh” cho dự án web app

## 3.1 Không để “Unhandled error” làm văng overlay

Nguyên tắc:

- API client có thể throw (`ApiError`).
- UI/hook phải catch và chuyển thành UX (message/toast/redirect).

## 3.2 “Best-effort” actions (logout, cleanup)

Logout là action “cleanup”, nên:

- API fail vẫn phải clear local state
- không throw ra UI

Trong dự án, logout đã được chỉnh theo hướng này ở `src/providers/auth-provider.tsx`.

## 3.3 Tách tầng rõ ràng

Gợi ý cấu trúc:

- `features/*/api.ts`: gọi API
- `shared/api/http-client.ts`: fetch wrapper, auth, retry
- `providers/*`: state app-level (auth)
- `shared/ui/*`: UI primitives, overlay

---

# 4) Next.js App Router (Next 16.2.6) — dùng đúng “phiên bản này”

## 4.1 Cấu trúc route trong `src/app`

Trong App Router, mỗi segment có thể có:

- `page.tsx` (page)
- `layout.tsx` (layout)
- `loading.tsx` (loading UI)
- `error.tsx` (error boundary)
- `not-found.tsx` (404)

Global layout của dự án: `src/app/layout.tsx`

## 4.2 Server Components vs Client Components

Mặc định là Server Component. Khi cần hooks/event handlers/browser API, thêm:

```ts
'use client';
```

Ví dụ client component trong dự án:

- `src/shared/ui/global-loading-overlay.tsx`
- `src/providers/auth-provider.tsx`

## 4.3 Import CSS đúng cách (và vì sao bạn từng bị lỗi)

Trong App Router, global CSS nên import ở `layout.tsx`:

```ts
import './globals.css';
```

Nếu bạn import CSS thư viện từ `node_modules`, hãy import từ `layout.tsx` (hoặc component entry phù hợp), tránh dùng `@import` trong CSS nếu bundler không resolve như mong đợi.

Ví dụ (đang dùng):

```ts
import '@uiw/react-md-editor/markdown-editor.css';
```

## 4.4 Fonts và môi trường offline/CI

Dự án dùng `next/font/google`. Khi build trong môi trường không có internet, bạn sẽ gặp lỗi fetch font.

2 hướng fix “dứt điểm”:

1) Dùng `next/font/local` và self-host font files trong repo.
2) Dùng system font stack (không fetch).

> Khi bạn muốn mình xử lý dứt điểm phần fonts (không phụ thuộc mạng), mình có thể chuyển dự án sang `next/font/local` (cần bạn cung cấp font files hoặc chấp nhận dùng system fonts).

---

# 5) TailwindCSS v4 A–Z (CSS-first, token-based)

## 5.1 Setup trong dự án

- `postcss.config.mjs` dùng plugin `@tailwindcss/postcss`
- `src/app/globals.css` import Tailwind bằng:

```css
@import 'tailwindcss';
```

## 5.2 Token hệ màu & theme

Trong `src/app/globals.css` có:

- CSS variables: `--background`, `--foreground`, `--accent`, ...
- `@theme inline` map tokens cho Tailwind utilities

Best practices:

- Ưu tiên dùng token (`bg-background`, `text-foreground`, …) thay vì hardcode màu.
- Khi tạo component mới, xem token có sẵn trước khi tự thêm màu mới.

## 5.3 Class naming & composition

Nếu có helper `cn`, dùng để ghép class conditionally, tránh chuỗi dài khó đọc.

---

# 6) Custom hooks thực chiến (copy dùng được)

> Các hooks dưới đây là mẫu. Bạn có thể đặt vào `src/shared/hooks/*` nếu muốn chuẩn hoá.

## 6.1 `useMounted` (tránh setState sau unmount)

```tsx
'use client';
import { useEffect, useRef } from 'react';

export function useMounted() {
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}
```

## 6.2 `useAsyncFn` (pending/error/value)

```tsx
'use client';
import { useCallback, useState } from 'react';

export function useAsyncFn<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [value, setValue] = useState<TResult | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await fn(...args);
        setValue(result);
        return result;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [fn],
  );

  return { run, isPending, error, value, setValue };
}
```

Use case: submit form, load data list, v.v.

## 6.3 `useDebouncedValue` (search input)

```tsx
'use client';
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

## 6.4 `useEvent` (stable callback tránh stale closure)

```tsx
'use client';
import { useCallback, useRef } from 'react';

export function useEvent<T extends (...args: any[]) => any>(handler: T) {
  const handlerRef = useRef<T>(handler);
  handlerRef.current = handler;
  return useCallback(((...args) => handlerRef.current(...args)) as T, []);
}
```

---

# 7) Patterns theo codebase (đọc để dùng đúng)

## 7.1 `httpClient` + `ApiError`

File: `src/shared/api/http-client.ts`

Ý tưởng:

- `parseResponse` sẽ throw `ApiError` nếu response không OK.
- `request` có thể retry khi 401 (refresh token).
- Có `showGlobalLoading` để bật overlay toàn cục.

Best practices khi dùng:

- UI layer **luôn** `try/catch` khi gọi API.
- Với action không critical (logout), xử lý “best-effort”.

## 7.2 Global loading overlay

- Store: `src/shared/ui/global-loading-store.ts`
- UI: `src/shared/ui/global-loading-overlay.tsx`

Lưu ý SSR: `useSyncExternalStore` phải có `getServerSnapshot`.

## 7.3 Auth provider

File: `src/providers/auth-provider.tsx`

Điểm quan trọng:

- Hydration gating để tránh mismatch khi đọc token (client-only storage).
- Logout best-effort: API fail vẫn clear local state.

---

# 8) Debug nhanh (những lỗi bạn đã gặp) + cách fix

## 8.1 CSS error: “Can't resolve '@uiw/react-md-editor/markdown-editor.css'”

Nguyên nhân: bundler/PostCSS/Tailwind xử lý `@import '@scope/pkg/file.css'` trong CSS không như mong đợi.

Fix: import CSS thư viện ở `src/app/layout.tsx` (JS/TS import), không import bằng `@import` trong `globals.css`.

## 8.2 Runtime error: “Missing getServerSnapshot…”

Nguyên nhân: `useSyncExternalStore` thiếu tham số thứ 3.

Fix: thêm `getServerSnapshot` vào store và truyền vào hook.

## 8.3 Build error: `next/font/google` failed to fetch

Nguyên nhân: môi trường build không có internet.

Fix dứt điểm: chuyển sang `next/font/local` hoặc system fonts.

---

# Checklist cuối (đọc xong là làm được)

- [ ] Tạo được route mới trong `src/app/*` + layout riêng.
- [ ] Viết được form mutation (pending + error + success) không văng overlay.
- [ ] Dùng Tailwind token theo `globals.css`, không hardcode màu.
- [ ] Biết khi nào cần `'use client'` và tránh hydration mismatch.
- [ ] Biết dùng/viết custom hook cho async + debounced + stable events.

