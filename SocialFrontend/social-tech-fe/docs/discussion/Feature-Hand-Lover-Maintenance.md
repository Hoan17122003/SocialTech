# Tai lieu maintain feature-hand va API lover

## 1. Muc tieu tai lieu

File nay duoc viet de giup team maintain nhanh tinh nang:

- Route: `src/app/(workspace)/feature-hand/page.tsx`
- Feature entry: `src/features/hand-gesture/components/feature-hand-experience.tsx`
- API adapter: `src/features/hand-gesture/hand-gesture-api.ts`
- Contract noi bo: `src/features/hand-gesture/contracts.ts`

Tinh nang nay ket hop 3 phan:

1. Kiem tra quyen truy cap `Role_Lover`
2. Goi `GET /api/lover` de lay media tu backend
3. Dung `Three.js` + `MediaPipe Hands` de render gallery va dieu khien bang cu dong tay

---

## 2. Luong tong the

### 2.1 Route

File `src/app/(workspace)/feature-hand/page.tsx` chi dong vai tro entry page va render `FeatureHandExperience`.

### 2.2 Authorization

Trong `FeatureHandExperience`:

- Doc auth state tu `useAuth()`
- Neu chua login thi redirect ve `APP_ROUTES.login`
- Neu khong co role `Role_Lover` thi redirect ve `APP_ROUTES.dashboard`

Nghia la route nay hien tai la private feature, chi dung cho tai khoan co role phu hop.

### 2.3 Khoi tao trai nghiem

Trong `useEffect` chinh, component se khoi tao song song:

1. `GET /api/lover` de lay media
2. `FilesetResolver.forVisionTasks(...)` de nap MediaPipe Hands
3. `navigator.mediaDevices.getUserMedia(...)` de bat camera

Sau khi co du lieu:

- media tu API se duoc chuyen thanh texture cua `Three.js`
- image dung `TextureLoader`
- video dung `HTMLVideoElement` + `THREE.VideoTexture`
- camera mini o goc phai duoc dung lam input cho MediaPipe
- hand landmarks se cap nhat rotation, layout va zoom cua gallery

---

## 3. Cach frontend dang goi `GET /api/lover`

Frontend dang goi:

```ts
httpClient.get('/api/lover', { auth: true })
```

Dieu nay co nghia:

- request se dung `appConfig.apiBaseUrl`
- request gui kem cookie
- neu co access token trong storage thi se gui `Authorization: Bearer ...`
- neu bi `401` thi `httpClient` co the thu refresh token theo logic chung cua repo

Neu backend doi auth mode, can kiem tra lai:

- `src/shared/api/http-client.ts`
- `src/common/config/env.ts`

---

## 4. Shape response ma frontend dang ho tro

Frontend hien tai co parser mang tinh "chiu loi" trong `hand-gesture-api.ts`.

No khong khoa cung mot JSON shape duy nhat, ma se thu boc tach media theo nhieu kieu:

### 4.1 Cac collection field duoc ho tro

Frontend se thu tim danh sach media trong:

- root array
- `data`
- `items`
- `files`
- `media`
- `results`
- `attachments`

### 4.2 Cac field path duoc ho tro

Moi item media se thu lay duong dan tu mot trong cac field:

- `url`
- `path`
- `filePath`
- `fileUrl`
- `mediaUrl`
- `src`
- `attachmentUrl`

Neu duong dan la relative path, frontend se dung:

```ts
new URL(path, appConfig.apiBaseUrl)
```

de doi thanh absolute URL.

### 4.3 Cac field type duoc ho tro

Frontend se thu nhan dien loai file tu:

- `type`
- `fileType`
- `mimeType`
- `mediaType`

Neu khong co field type dung, frontend se thu suy ra theo duoi file:

- Video: `.mp4`, `.webm`, `.mov`, `.m4v`
- Image: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`

### 4.4 Cac field title duoc ho tro

Frontend thu lay ten hien thi tu:

- `title`
- `name`
- `fileName`
- `originalName`

Neu khong co, se gan mac dinh dang `Lover media {index}`.

---

## 5. Contract noi bo sau khi normalize

Sau khi parse xong, frontend dua ve contract:

```ts
type LoverMediaItem = {
    id: string;
    type: 'image' | 'video';
    url: string;
    title: string;
    rawType: string;
};
```

Y nghia:

- `id`: khoa on dinh cho item
- `type`: frontend chi quan tam `image` hoac `video`
- `url`: URL sau khi da normalize
- `title`: ten de debug hoac hien thi mo rong ve sau
- `rawType`: gia tri type backend gui len truoc khi frontend rut gon

---

## 6. Khi nao gallery dung fallback

Frontend khong de man hinh vo tran neu API co van de.

Gallery fallback se duoc dung khi:

1. `GET /api/lover` bi loi
2. API tra ve rong
3. Item khong co duong dan hop le
4. Item co duong dan nhung load texture that bai

Khi do:

- UI van cho thay camera va hand tracking
- gallery mau se duoc dung tam de giu trai nghiem
- `galleryError` se hien thong diep de team biet ly do

Muc dich cua fallback:

- tranh trang feature bi "chet" chi vi backend tra du lieu xau
- giup debug nhanh tren moi truong staging/dev

---

## 7. Gesture map hien tai

Mapping cu dong tay hien tai:

- Open palm: bo cuc `circle`
- Peace sign: bo cuc `heart`
- Fist: bo cuc `stack`
- Pinch: zoom item dang duoc focus

Neu can doi gesture:

- doc `detectGestureState(...)`
- doc `normalizeFingerState(...)`
- doc `buildLayoutPosition(...)`

Ba diem nay la "trung tam nghiep vu" cua hand interaction.

---

## 8. Cac diem de thay doi an toan nhat

Neu backend doi response, uu tien sua o:

- `src/features/hand-gesture/hand-gesture-api.ts`

Khong nen nhay thang vao `feature-hand-experience.tsx` de parse JSON, vi se lam component bi phinh va kho test logic.

Neu muon doi giao dien hoac cach render:

- sua `feature-hand-experience.tsx`

Neu muon doi contract noi bo:

- sua `contracts.ts`
- sau do sua API adapter va component theo contract moi

---

## 9. Checklist khi backend doi contract `api/lover`

Khi backend thay doi API, check theo thu tu nay:

1. Response danh sach nam o field nao
2. Path file nam o field nao
3. Type file nam o field nao
4. Path do la relative hay absolute
5. Video co CORS dung de browser load duoc khong
6. File co yeu cau auth header truc tiep khi tai asset khong

Luu y quan trong:

- `THREE.TextureLoader` va the `video` client-side khong tu dong gui `Authorization` header tu custom fetch helper
- vi vay media URL ly tuong nen la public URL, signed URL, hoac URL co the truy cap bang cookie/session

Neu backend bat buoc auth header khi tai file, can doi chien luoc load asset, vi `TextureLoader` hien tai khong phu hop cho kieu do.

---

## 10. Vi sao khong can sua `next.config.ts`

Feature nay hien tai khong dung `next/image`.

No render media thong qua:

- `THREE.TextureLoader`
- `THREE.VideoTexture`

Vi vay:

- khong can them `images.remotePatterns`
- khong can config image domains trong `next.config.ts`

Chi can sua `next.config.ts` neu sau nay:

- team doi sang `next/image`
- team them rewrite/proxy cho media
- team can CSP, header, hoac rule deploy dac thu cho asset remote

---

## 11. Goi y mo rong trong tuong lai

Neu muon maintain de hon nua, co the tach tiep:

1. Tach media loader thanh file rieng, vi hien tai nam chung trong component
2. Tach gesture detection thanh util rieng de de unit test
3. Co mot mock JSON mau cua `api/lover` trong docs hoac test fixture
4. Them log debug mode cho item nao bi bo qua khi normalize

---

## 12. Mau JSON backend nen huong toi

Frontend hien tai da chiu loi kha nhieu, nhung de maintain de nhat thi backend nen on dinh theo mot shape ro rang, vi du:

```json
{
  "success": true,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "title": "Summer photo",
      "fileType": "image/jpeg",
      "fileUrl": "/uploads/lover/photo-1.jpg"
    },
    {
      "id": 2,
      "title": "Short clip",
      "fileType": "video/mp4",
      "fileUrl": "/uploads/lover/video-1.mp4"
    }
  ]
}
```

Neu backend giu on dinh shape nay, frontend se it phai doan field hon va maintain de hon rat nhieu.
