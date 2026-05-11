# Social Tech Frontend

Frontend Next.js cua Social Tech duoc to chuc theo huong `src/`-first de gom toan bo code runtime vao mot cho, de tim va mo rong hon.

## Cac thu muc chinh

- `src/app`: route, layout, page cua Next.js App Router.
- `src/features`: code theo domain nghiep vu nhu `auth`, `articles`, `users`.
- `src/shared`: UI, layout, navigation, API helpers tai su dung.
- `src/common`: config, constants, types, utils dung chung.
- `src/providers`: context/provider xuyen suot ung dung.
- `public`: static assets.
- `docs`: tai lieu phan tich va kien truc.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Ghi chu ve import alias

Project dung alias `@/*` va tro toi `src/*`.
Vi du:

```ts
import { APP_ROUTES } from '@/common/constants/app-routes';
import { ArticleComposer } from '@/features/articles/components/article-composer';
```
