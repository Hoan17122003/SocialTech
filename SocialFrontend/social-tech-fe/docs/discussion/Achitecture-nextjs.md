# Kien truc frontend Next.js cho Social Tech

## 1. Muc tieu cua source base

Source base trong `SocialFrontend/social-tech-fe` duoc dung lai theo huong co the di tiep thanh du an thuc te, khong chi la scaffold mac dinh cua Next.js. Muc tieu chinh:

- Dong bo hop dong du lieu voi backend hien tai, uu tien cac module `Auth`, `User`, `Article`.
- To chuc source theo tinh than common hoa giong backend: co khu vuc `common` dung chung, cac `features` tach theo nghiep vu va `providers` de quan ly cross-cutting concerns.
- Ap dung App Router cua Next.js de phan tach ro route marketing, auth va workspace.
- Tao san mot lop HTTP client typed, ho tro `Bearer token`, cookie refresh token va multipart form-data.
- Giu base de team co the mo rong them state management, caching, SSR/CSR tuy theo use case ma khong can dap di lam lai.

## 2. Tong quan kien truc

Frontend duoc to chuc theo 5 lop chinh:

1. `app/`
   Chua routing cua Next.js App Router, cac layout va page entrypoint.
2. `features/`
   Moi nghiep vu lon co mot module rieng gom contracts, API layer va UI components. Hien tai da co `auth`, `articles`, `users`.
3. `shared/`
   Chua cac khoi co the tai su dung giua nhieu features nhu `http-client`, `token-storage`, shell layout, navigation va UI atoms.
4. `common/`
   Chua config, constants, types va utils dung chung cho toan he thong. Vai tro nay map tuong doi voi `Common` ben backend.
5. `providers/`
   Chua context/provider cap ung state xuyen suot ung dung, hien tai la `AuthProvider`.

Huong chia nay giup frontend co tinh chat sau:

- Page chi lam nhiem vu orchestration va composition.
- Contract API duoc gom vao feature thay vi viet lan trong component.
- Code dung chung duoc dua ve `common` va `shared` de tranh duplicate.
- Authentication la mot concern xuyen suot nen duoc dat o `providers` + `shared/api`.

## 3. Cau truc thu muc

```text
social-tech-fe/
|-- app/
|   |-- (auth)/
|   |   |-- login/page.tsx
|   |   `-- register/page.tsx
|   |-- (workspace)/
|   |   |-- articles/
|   |   |   |-- [id]/page.tsx
|   |   |   `-- new/page.tsx
|   |   |-- profile/[id]/page.tsx
|   |   |-- dashboard/page.tsx
|   |   `-- layout.tsx
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- common/
|   |-- config/env.ts
|   |-- constants/app-routes.ts
|   |-- types/api.ts
|   `-- utils/
|       |-- cn.ts
|       |-- format-date.ts
|       |-- object-to-form-data.ts
|       `-- query-string.ts
|-- docs/discussion/Achitecture-nextjs.md
|-- features/
|   |-- articles/
|   |   |-- articles-api.ts
|   |   |-- contracts.ts
|   |   `-- components/
|   |       |-- article-composer.tsx
|   |       `-- article-detail-card.tsx
|   |-- auth/
|   |   |-- auth-api.ts
|   |   |-- contracts.ts
|   |   `-- components/
|   |       |-- login-form.tsx
|   |       `-- register-form.tsx
|   `-- users/
|       |-- contracts.ts
|       |-- users-api.ts
|       `-- components/
|           `-- profile-panel.tsx
|-- providers/
|   |-- app-provider.tsx
|   `-- auth-provider.tsx
`-- shared/
    |-- api/
    |   |-- http-client.ts
    |   `-- token-storage.ts
    |-- layout/app-shell.tsx
    |-- navigation/app-header.tsx
    `-- ui/
        |-- button.tsx
        |-- card.tsx
        |-- empty-state.tsx
        |-- field.tsx
        |-- form-message.tsx
        `-- section-shell.tsx
```

## 4. Giai thich tung phan

### 4.1 `app/`

Day la lop tiep xuc truc tiep voi router cua Next.js.

- `app/layout.tsx`
  Root layout, khai bao metadata, fonts va wrap `AppProvider`.
- `app/page.tsx`
  Landing page gioi thieu base architecture va diem vao cac luong chinh.
- `app/(auth)/...`
  Route group cho cac man hinh chua xac thuc nhu login, register.
- `app/(workspace)/layout.tsx`
  Workspace layout dung `AppShell`, render navigation, shell chung.
- `app/(workspace)/dashboard/page.tsx`
  Dashboard tong quan cho team FE/BE test nhanh luong nghiep vu.
- `app/(workspace)/articles/new/page.tsx`
  Man hinh tao bai viet moi.
- `app/(workspace)/articles/[id]/page.tsx`
  Man hinh doc chi tiet bai viet theo id.
- `app/(workspace)/profile/[id]/page.tsx`
  Man hinh profile va update thong tin ca nhan.

Ly do dung route groups:

- Giup tach auth flow va authenticated workspace clean hon.
- Sau nay co the them middleware, layout, loading/error boundary rieng cho tung nhom route.

### 4.2 `common/`

`common` giong vai tro `Common` trong backend: chua nhung gi on dinh va duoc dung o nhieu noi.

- `config/env.ts`
  Khai bao config runtime nhu `NEXT_PUBLIC_API_BASE_URL`, ten app va storage key.
- `constants/app-routes.ts`
  Chua route constants de tranh hard-code link lap lai.
- `types/api.ts`
  Chua `ApiResponse<T>` va `ApiError`, map theo structure backend tra ve.
- `utils/cn.ts`
  Helper ghep className nho gon.
- `utils/format-date.ts`
  Dinh dang ngay gio hien thi theo locale `vi-VN`.
- `utils/object-to-form-data.ts`
  Chuyen payload object thanh `FormData` cho cac endpoint upload file.
- `utils/query-string.ts`
  Build query string cho cac API co paging/filter.

### 4.3 `features/`

Moi folder trong `features` dai dien cho mot domain nghiep vu. Moi feature gom 3 lop:

- `contracts.ts`
  Khai bao type/DTO frontend map tu backend DTOs va response models.
- `*-api.ts`
  Gom ham giao tiep HTTP voi backend.
- `components/`
  Chua UI components sat voi domain do.

Chi tiet tung feature:

#### `features/auth`

- `contracts.ts`
  Dinh nghia `LoginRequest`, `LoginResponse`, `RegisterRequest`.
- `auth-api.ts`
  Goi `POST /api/Auth/login`, `POST /api/Auth/logout`, `POST /api/User/create`.
- `components/login-form.tsx`
  Form dang nhap, dung `AuthProvider` de set token va redirect dashboard.
- `components/register-form.tsx`
  Form dang ky, giu contract trung backend.

#### `features/users`

- `contracts.ts`
  Dinh nghia `UserProfile`, `UpdateUserRequest`, `FollowerUser`.
- `users-api.ts`
  Chua cac API `profile`, `profile/update`, `follow`, `unfollow`, `followers`.
- `components/profile-panel.tsx`
  Tai profile, hien thong tin, recent posts va form cap nhat multipart.

#### `features/articles`

- `contracts.ts`
  Dinh nghia `CreateArticleRequest`, `UpdateArticleRequest`, `ArticleDetail`.
- `articles-api.ts`
  Chua cac API create/detail/update/delete article.
- `components/article-composer.tsx`
  Form tao bai viet map toi `multipart/form-data`.
- `components/article-detail-card.tsx`
  Tai va render chi tiet bai viet theo id.

### 4.4 `shared/`

`shared` chua cac khoi tai su dung nhieu lan, nhung khong phai business rule cua mot feature cu the.

#### `shared/api`

- `token-storage.ts`
  Doc/ghi/xoa access token trong `localStorage`.
- `http-client.ts`
  Wrapper quanh `fetch`, phu trach:
  - Gan `Authorization: Bearer`.
  - Tu dong gui `credentials: include` de backend xu ly refresh token qua cookie.
  - Retry mot lan khi gap `401` bang cach goi `POST /api/Auth/accessToken-generate`.
  - Parse loi thanh `ApiError`.
  - Ho tro JSON va `FormData`.

#### `shared/layout`

- `app-shell.tsx`
  Dinh nghia shell tong cho workspace page.

#### `shared/navigation`

- `app-header.tsx`
  Thanh dieu huong chinh, hien thi menu va logout action.

#### `shared/ui`

Day la tap hop primitive UI:

- `button.tsx`
  Nut co variant dung chung.
- `card.tsx`
  Shell card chung cho section, form, state blocks.
- `empty-state.tsx`
  Trang thai loading/error/empty don gian.
- `field.tsx`
  `Input` va `Textarea` dung chung.
- `form-message.tsx`
  Hien thi thong bao loi/thanh cong.
- `section-shell.tsx`
  Component khung cho tung section lon.

### 4.5 `providers/`

- `app-provider.tsx`
  Entry point gom tat ca providers cua app.
- `auth-provider.tsx`
  Quan ly session client:
  - Nap access token tu `localStorage`.
  - Cung cap `login`.
  - Cung cap `logout`.
  - Expose `isAuthenticated`.

Vie tri dat provider:

- Root layout chi wrap provider tong.
- Business feature goi `useAuth()` khi can.
- Auth state duoc chia se cho navigation va page client components.

## 5. Mapping voi backend hien tai

Frontend da map truc tiep theo API/controller hien co:

- `AuthController`
  - `POST /api/Auth/login`
  - `POST /api/Auth/logout`
  - `POST /api/Auth/accessToken-generate`
- `UserController`
  - `POST /api/User/create`
  - `POST /api/User/profile/{id}`
  - `POST /api/User/profile/update`
  - `POST /api/User/follow`
  - `POST /api/User/unfollow`
  - `GET /api/User/followers`
- `ArticleController`
  - `POST /api/Article/create`
  - `GET /api/Article/detail/{articleId}`
  - `PUT /api/Article/update/{articleId}`
  - `DELETE /api/Article/delete/{articleId}`

Ngoai ra:

- `ApiResponse<T>` phia FE duoc model lai tu `SocialBackEnd.Common.Models.ApiResponse<T>`.
- Cac DTO nhu `LoginRequest`, `RequestCreateAccount`, `RequestUpdateAccount`, `RequestCreateArticle`, `RequestUpdateArticle` da duoc map thanh contracts o tung feature.
- Cach tach `common` phia frontend nham giong tinh than tai su dung cua backend `Common`.

## 6. Nguyen tac thiet ke da ap dung

### 6.1 Typed boundary truoc UI

Moi endpoint deu co contract/type ro rang truoc khi dua vao component. Dieu nay giup:

- Giam loi khi backend doi DTO.
- De sinh test sau nay.
- De thay the `fetch` bang React Query/SWR ma khong can doi component qua nhieu.

### 6.2 UI khong noi truc tiep voi endpoint

Component goi qua `features/*-api.ts`, khong `fetch` truc tiep trong JSX. Loi ich:

- Tinh dong goi cao hon.
- Doi auth/header/retry chi can sua mot noi.
- Tai su dung logic API cho nhieu page.

### 6.3 Common hoa cross-cutting concerns

Nhung concern xuyen suot duoc tach rieng:

- Auth token storage.
- HTTP retry/refresh.
- Route constants.
- Format helpers.
- Reusable UI primitives.

Do la cach frontend “common hoa” tuong tu backend dang tach `Common`, `Infrastructure`, `Presentation`.

### 6.4 Feature-first thay vi page-first

Neu de moi page tu quan ly state + API + types rieng, code se nhanh roi. Cach chia theo feature giup:

- Doi nghiep vu nao, tim file trong feature do.
- Nhieu page co the cung dung lai cung mot API layer va business component.
- De mo rong sang `comment`, `community`, `notification`, `search` sau nay.

## 7. Luong xu ly authentication

Luong auth base hien tai:

1. User submit login form.
2. `AuthProvider.login()` goi `authApi.login()`.
3. Backend tra `accessToken`.
4. FE luu `accessToken` vao `localStorage`.
5. Moi request can auth se duoc `http-client` gan `Authorization`.
6. Neu backend tra `401`, `http-client` thu goi `POST /api/Auth/accessToken-generate`.
7. Neu refresh thanh cong, token moi duoc luu lai va request chay lai 1 lan.
8. Neu refresh that bai, token local bi xoa.

Ghi chu:

- Flow nay phu hop voi backend hien tai dang giu refresh token qua cookie.
- Sau nay co the nang cap sang server-side auth, middleware guard hoac BFF proxy neu can.

## 8. Dinh huong mo rong tiep theo

Source base nay da san sang cho cac buoc tiep:

- Them `middleware.ts` neu muon chan route can login.
- Them `loading.tsx`, `error.tsx` cho tung route group.
- Tich hop React Query/SWR cho cache va revalidation.
- Tach them `entities` neu so feature tang manh.
- Them test voi `Vitest`/`Playwright`.
- Them `comment`, `community`, `feed`, `search`, `notification`.
- Doi `localStorage` auth sang mo hinh an toan hon neu can SSR hoac yeu cau security cao hon.

## 9. Ket luan

Frontend da duoc dung thanh mot source base Next.js App Router co tinh chat production-oriented:

- Co routing ro rang.
- Co feature modules.
- Co common/shared/provider layers.
- Co mapping truc tiep toi backend APIs hien tai.
- Co UI skeleton de test luong auth, user, article ngay lap tuc.

Day la diem bat dau tot de team tiep tuc xay dung san pham ma van giu duoc ky luat kien truc, kha nang tai su dung va toc do phat trien.
