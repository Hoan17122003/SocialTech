# Tai lieu giai thich tinh nang `feature-hand` tu A-Z

## 1. Muc tieu cua tai lieu

Tai lieu nay duoc viet de giai thich chi tiet tinh nang `feature-hand` da duoc tich hop trong frontend, bao gom:

- Muc dich nghiep vu va pham vi su dung.
- Cac file code tham gia vao tinh nang.
- Cac thu vien dang dung va vai tro cua tung thu vien.
- Luong khoi tao, render, hand tracking, gesture mapping va role guard.
- Cach route `/feature-hand` duoc khoa theo role `ROLE_lover`.
- Cac gia dinh dang co trong source hien tai.
- Cac gioi han hien tai va huong mo rong tiep theo.

Tai lieu nay phu hop cho:

- Onboarding thanh vien moi.
- Review kien truc frontend.
- Debug feature hand tracking.
- Mo rong them gesture, layout hoac data image that.

---

## 2. Tong quan tinh nang

Tinh nang `feature-hand` la mot man hinh tuong tac theo cu dong tay.

Khi nguoi dung truy cap route `/feature-hand`:

- Frontend kiem tra user da dang nhap hay chua.
- Frontend kiem tra access token co role `ROLE_lover` hay khong.
- Neu khong hop le, user bi dieu huong khoi man hinh nay.
- Neu hop le, frontend khoi tao mot khong gian 3D bang `Three.js`.
- Dong thoi frontend mo webcam va nap mo hinh nhan dien ban tay bang `MediaPipe Hands`.
- Dinh vi ban tay se dieu khien gallery anh nam giua man hinh.

Gallery hien tai duoc demo bang 7 the anh tao tu `canvas texture`, chua noi voi du lieu image that tu backend.

Nguoi dung co the thao tac:

- Open palm: chuyen bo cuc sang vong tron quay.
- Peace sign: chuyen bo cuc sang hinh trai tim.
- Fist: chuyen bo cuc sang kieu xep chong.
- Pinch: zoom/focus vao anh dang duoc chon.

---

## 3. Pham vi va rang buoc

Tinh nang nay hien dang duoc gioi han ro rang:

1. Chi ton tai tren route `/feature-hand`.
2. Chi user co role `ROLE_lover` moi duoc phep su dung.
3. Chi chay o client-side vi can:
   - webcam
   - `window`
   - `navigator.mediaDevices`
   - WebGL
4. Hien tai phu thuoc vao CDN de load WASM va model cua MediaPipe.

Dieu nay co nghia:

- Khong co SSR cho logic hand tracking.
- Khong co hand tracking neu trinh duyet khong cap webcam permission.
- Khong co hoat dong neu moi truong chan truy cap toi asset runtime cua MediaPipe.

---

## 4. Cac file code tham gia

### 4.1 Route entry

File:

- `social-tech-fe/src/app/(workspace)/feature-hand/page.tsx`

Vai tro:

- La entry page cho route `/feature-hand`.
- Khong chua logic nghiep vu lon.
- Chi render component chinh `FeatureHandExperience`.

Day la cach to chuc tot vi page giu nhiem vu composition, con toan bo logic lon duoc day ve feature component.

### 4.2 Component trung tam cua tinh nang

File:

- `social-tech-fe/src/features/hand-gesture/components/feature-hand-experience.tsx`

Vai tro:

- Chua toan bo UI va runtime logic cua feature.
- Kiem tra role va redirect.
- Khoi tao scene 3D bang `Three.js`.
- Khoi tao camera webcam.
- Khoi tao `HandLandmarker` cua MediaPipe.
- Phan tich landmarks cua ban tay.
- Anh xa gesture thanh layout va zoom state.
- Render giao dien thong tin ben trai va san khau 3D ben phai.

Day la file quan trong nhat cua tinh nang.

### 4.3 Auth provider

File:

- `social-tech-fe/src/providers/auth-provider.tsx`

Vai tro:

- Quan ly auth state xuyen suot app.
- Doc `accessToken` tu local storage.
- Suy ra danh sach role tu access token.
- Expose `roles` va `hasRole()` cho cac feature khac.

Tinh nang `feature-hand` dung chinh provider nay de biet user co duoc vao route hay khong.

### 4.4 Utility tach role tu JWT

File:

- `social-tech-fe/src/shared/auth/role-utils.ts`

Vai tro:

- Giai ma payload cua JWT o phia client.
- Tim role trong cac key pho bien:
  - `role`
  - `roles`
  - `authorities`
  - `authority`
  - claim role chuan cua .NET
- Chuan hoa role thanh `string[]`.

Day la lop giup frontend linh hoat hon khi backend co the tra role theo nhieu dang claim khac nhau.

### 4.5 Route constants

File:

- `social-tech-fe/src/common/constants/app-routes.ts`

Vai tro:

- Them constant `featureHand: '/feature-hand'`.
- Giup tranh hard-code route lung tung trong nhieu noi.

### 4.6 Shortcut trong shell

File:

- `social-tech-fe/src/shared/layout/app-shell.tsx`

Vai tro:

- Them shortcut menu den route `feature-hand`.
- Giup user co the mo nhanh tinh nang tu floating action menu.

### 4.7 Package dependencies

File:

- `social-tech-fe/package.json`
- `social-tech-fe/package-lock.json`

Vai tro:

- Bo sung `three`
- Bo sung `@mediapipe/tasks-vision`

---

## 5. Thu vien dang dung va muc dich

### 5.1 Three.js

Thu vien:

- `three`

Dung de:

- Tao scene 3D.
- Tao camera phoi canh.
- Tao light.
- Tao `PlaneGeometry` cho tung card anh.
- Tao animation va cap nhat vi tri, scale, rotation cua image cards.

Ly do chon:

- De ta co duoc khong gian 3D mem, dep va linh hoat hon so voi chi dung CSS transform 2D.
- Phu hop khi muon cho gallery quay, nghiêng, di chuyen theo gesture.

### 5.2 MediaPipe Tasks Vision

Thu vien:

- `@mediapipe/tasks-vision`

Dung de:

- Nap `HandLandmarker`.
- Nhan dien mot ban tay trong video webcam.
- Tra ve hand landmarks theo tung frame.

Ly do chon:

- MediaPipe la huong pho bien cho hand tracking tren web.
- Bo `tasks-vision` de su dung hon so voi viec tu ghep low-level pipeline.

### 5.3 Next.js App Router

Dung de:

- To chuc route `src/app/(workspace)/feature-hand/page.tsx`.
- Dieu huong bang `useRouter`.

### 5.4 React client component

Dung de:

- Quan ly lifecycle khoi tao/don dep cua webcam, renderer va hand landmarker.
- Luu state thong tin UI nhu:
  - layout hien tai
  - message tracking
  - camera ready hay chua
  - loi khoi tao

---

## 6. Cau truc giao dien cua man hinh

Man hinh `feature-hand` duoc chia thanh 2 khoi lon:

### 6.1 Panel trai

Muc dich:

- Giai thich role gating.
- Giai thich gesture map.
- Hien layout hien tai.
- Hien tracking status.
- Hien thong bao loi neu camera hoac MediaPipe khoi tao that bai.

Panel nay giup feature khong chi la demo ky thuat, ma con co tinh giao tiep ro rang voi nguoi dung.

### 6.2 San khau 3D ben phai

Muc dich:

- Render gallery anh 3D.
- Hien the anh o trung tam man hinh.
- Hien camera preview nho o goc duoi phai de user biet webcam dang bat va de canh tay vao frame.

Phan nay la noi chua `renderer.domElement` cua Three.js.

---

## 7. Luong hoat dong runtime tu dau den cuoi

Phan nay la trai tim cua tai lieu.

### 7.1 User truy cap `/feature-hand`

Khi user vao route:

- Next.js render `page.tsx`.
- `page.tsx` render `FeatureHandExperience`.

### 7.2 Component doc auth state

`FeatureHandExperience` goi `useAuth()` de lay:

- `isHydrated`
- `isAuthenticated`
- `hasRole`

`isHydrated` duoc dung de dam bao component da chay o client va da co the doc local storage.

### 7.3 Guard quyen truy cap

Component co `useEffect` de redirect:

- Neu chua dang nhap: `router.replace('/login')`
- Neu da dang nhap nhung khong co `ROLE_lover`: `router.replace('/dashboard')`

Nghia la:

- Route nay khong mo cho anonymous user.
- Route nay cung khong mo cho user role khac.

### 7.4 Chi khi authorized moi khoi tao runtime 3D + hand tracking

Sau khi `isAuthorized === true`, component moi bat dau:

- Tao `Three.Scene`
- Tao `PerspectiveCamera`
- Tao `Group` chua gallery
- Tao light
- Tao 7 card anh
- Tao `WebGLRenderer`
- Xin quyen webcam
- Khoi tao MediaPipe `HandLandmarker`
- Chay animation loop

Day la cach tot de:

- Tranh khoi tao tai nguyen nang khi user khong du quyen.
- Tranh mo webcam voi user khong duoc phep.

---

## 8. Auth va role guard hoat dong nhu the nao

### 8.1 Nguon goc access token

Khi login thanh cong:

- frontend goi `authApi.login`
- backend tra ve `accessToken`
- `AuthProvider` luu token vao `tokenStorage`

### 8.2 Lay role tu token

`AuthProvider` goi:

- `getRolesFromAccessToken(accessToken)`

Ham nay:

1. Tach JWT thanh 3 phan bang dau `.`
2. Lay payload
3. Decode base64url
4. `JSON.parse` payload
5. Doc cac key co the chua role
6. Chuan hoa thanh mang role duy nhat khong trung

### 8.3 Tai sao can utility rieng

Vi backend co the encode role theo nhieu kieu:

- 1 string
- 1 mang string
- claim theo chuan cua .NET
- authority/authorities

Neu khong co utility nay, frontend se bi cung vao duy nhat 1 dang claim va de vo khi backend doi format.

### 8.4 Cach feature kiem tra role

Trong `FeatureHandExperience`:

- `const isAuthorized = isAuthenticated && hasRole('ROLE_lover')`

Tu day:

- neu `false` thi redirect
- neu `true` thi cho phep khoi tao tinh nang

---

## 9. Khoi tao gallery bang Three.js

### 9.1 Scene

Scene duoc tao de chua toan bo object 3D.

Background duoc set thanh mau toi:

- `#050816`

Muc tieu:

- Tao cam giac cinematic
- Lam noi bat card images va hieu ung mau

### 9.2 Camera

Camera su dung:

- `THREE.PerspectiveCamera(45, 1, 0.1, 100)`

Vi tri camera:

- `z = 12.5`

Y nghia:

- Camera du xa de nhin thay toan gallery.
- Van du gan de hieu ung zoom va orbit trong tu nhien.

### 9.3 Gallery root

`galleryRoot` la mot `THREE.Group`.

Vai tro:

- Chua toan bo image cards.
- Khi can xoay theo ban tay, ta xoay ca group thay vi xoay tung card mot cach phuc tap.

Day la mot quyet dinh thiet ke dung, vi group-level transform giup code don gian hon.

### 9.4 Light

Scene dang dung:

- `AmbientLight`
- `PointLight`

Vai tro:

- Lam gallery khong bi qua toi.
- Tao them rim/pink accent de card co do sau thi giac.

Luu y:

- Card hien tai dung `MeshBasicMaterial`, ve mat ly thuyet no it phu thuoc light.
- Tuy vay, viec giu light san sang ho tro tot neu sau nay doi sang material co shading that.

### 9.5 Renderer

Renderer:

- `THREE.WebGLRenderer({ antialias: true, alpha: true })`

Muc dich:

- Bat anti-alias de vien card mem hon.
- Ho tro render dep tren browser.

Co them:

- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`

De tranh render qua nang tren man hinh pixel ratio cao.

---

## 10. Gallery images duoc tao ra nhu the nao

Hien tai gallery chua lay image that tu API.

Thay vao do, moi card duoc tao bang:

1. Tao `canvas`
2. Ve gradient background
3. Ve text va cac hinh khoi
4. Chuyen canvas thanh `THREE.CanvasTexture`
5. Gan texture do vao `MeshBasicMaterial`
6. Dung `PlaneGeometry(1.8, 2.4)` lam mat phang cho card

Ly do chon cach nay:

- Khong can phu thuoc image that trong giai doan demo feature.
- Chu dong tao visual dep va dong bo.
- Co the thay the de dang sau nay bang texture tao tu URL anh that.

Neu muon noi image that sau nay, ta co the:

- dung `THREE.TextureLoader`
- preload URL anh
- tao card tu data backend

---

## 11. MediaPipe Hands duoc khoi tao nhu the nao

### 11.1 Nap FilesetResolver

Code dung:

- `FilesetResolver.forVisionTasks(MEDIA_PIPE_VISION_URL)`

No se nap WASM runtime cho MediaPipe Vision tasks.

### 11.2 Tao HandLandmarker

Code dung:

- `HandLandmarker.createFromOptions(...)`

Options quan trong:

- `modelAssetPath`
- `numHands: 1`
- `runningMode: 'VIDEO'`

Y nghia:

- Chi theo doi 1 ban tay de tranh phuc tap khong can thiet.
- Toi uu cho stream video lien tuc thay vi xu ly anh tinh.

### 11.3 Webcam

Frontend goi:

- `navigator.mediaDevices.getUserMedia(...)`

voi:

- `facingMode: 'user'`
- `width ideal 1280`
- `height ideal 720`

Muc tieu:

- Dung camera truoc.
- Co do phan giai du tot cho hand tracking.

### 11.4 Gan stream vao the video

Video element duoc dung lam nguon vao cho MediaPipe.

Luong:

1. `video.srcObject = stream`
2. `await video.play()`
3. moi frame se doc du lieu tu video nay

---

## 12. Animation loop hoat dong nhu the nao

Sau khi khoi tao xong, component chay `requestAnimationFrame`.

Moi vong lap:

1. Kiem tra video da co frame moi chua.
2. Neu co, goi `handLandmarker.detectForVideo(video, performance.now())`.
3. Lay `result.landmarks[0]` cua ban tay dau tien.
4. Neu co ban tay:
   - tinh trang thai gesture moi
   - cap nhat `targetState`
   - cap nhat thong diep UI
5. Neu khong co ban tay:
   - danh dau khong detect duoc
   - hien thong diep huong dan user dua tay vao frame
6. Noi suy mem gallery root rotation.
7. Noi suy mem scale cua gallery.
8. Noi suy mem position/rotation/opacity/scale cua tung card.
9. Render scene.
10. Goi frame tiep theo.

Tu khoa quan trong o day la:

- smooth
- lerp
- frame-based interaction

Do ta khong nhay truc tiep state 3D theo gia tri tay, ma di chuyen mem dan, trai nghiem se dep hon.

---

## 13. Hand landmarks duoc phan tich nhu the nao

MediaPipe tra ve 21 diem landmarks.

Tinh nang hien tai chi dung mot tap con cua chung:

- wrist: `0`
- thumb tip: `4`
- index tip: `8`
- middle tip: `12`
- ring tip: `16`
- pinky tip: `20`

Ngoai ra co dung them cac khop:

- `6`, `10`, `14`, `18`

de uoc luong ngon tay dang duoi ra hay dang gap lai.

### 13.1 `distance()`

Ham `distance(a, b)` tinh khoang cach 2 diem.

Dung de:

- do pinch giua thumb va index
- do muc do mo rong cua ban tay
- do ngon tay dang extend hay khong

### 13.2 `normalizeFingerState()`

Ham nay:

- so sanh khoang cach tu fingertip toi wrist
- so voi khoang cach tu khop giua toi wrist

Neu fingertip xa wrist hon ro rang, co the xem ngon tay dang duoi ra.

Ket qua tra ve:

- `fingersExtended`
- `extendedCount`

Day la buoc tiep can mang tinh heuristic, khong phai computer vision classification chinh quy, nhung du cho demo tuong tac.

---

## 14. Gesture mapping hien tai

### 14.1 Open palm

Dieu kien gan dung:

- `extendedCount >= 4`
- `spread > 0.34`

Tac dung:

- set `layout = 'circle'`

Y nghia UX:

- open palm la gesture tu nhien de "mo" khong gian gallery.

### 14.2 Peace sign

Dieu kien gan dung:

- index mo
- middle mo
- ring khong mo
- pinky khong mo

Tac dung:

- set `layout = 'heart'`

Y nghia UX:

- rat hop voi concept `ROLE_lover`
- bo cuc trai tim co tinh bieu tuong va thiet ke ro rang

### 14.3 Fist

Dieu kien gan dung:

- `extendedCount <= 1`
- `spread < 0.28`

Tac dung:

- set `layout = 'stack'`

Y nghia UX:

- nam tay tao cam giac "gom" gallery lai thanh tung lop.

### 14.4 Pinch

Dieu kien:

- khoang cach giua thumb tip va index tip nho hon threshold

Tac dung:

- anh duoc focus se phong to hon
- cac anh con lai giam opacity nhe

Y nghia UX:

- tao hieu ung zoom vao the anh dang duoc user "chup" bang tay.

---

## 15. Cac layout duoc tinh ra sao

Logic nay nam trong `buildLayoutPosition()`.

### 15.1 Layout `circle`

Moi card:

- duoc dat theo goc tren duong tron
- co dao dong theo truc `z`
- co rotation nhe de tao cam giac orbit 3D

Ket qua:

- gallery quay quanh tam
- nhin dep va co chieu sau

### 15.2 Layout `heart`

Moi card:

- duoc dat theo cong thuc tham so hinh trai tim

Cong thuc dung:

- `x = 16 * sin(t)^3`
- `y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)`

Sau do:

- scale lai cho vua scene
- them `z` nhe de khong qua phang

Ket qua:

- bo cuc trai tim hien ra ro rang
- phu hop chu de lover

### 15.3 Layout `stack`

Moi card:

- lech nhau mot chut theo `x`, `y`, `z`
- co xoay nhe tung card

Ket qua:

- giong mot xap anh duoc xep chong co chu y do sau

---

## 16. Cach chon anh focus

Feature tinh `focusIndex` dua tren vi tri trung binh cua mot vai diem tay.

Cu the:

- lay wrist
- lay index tip
- lay pinky tip
- tinh centerX gan dung
- map centerX ve mien `0 -> GALLERY_SIZE - 1`

Y nghia:

- khi user dua tay sang trai/phai, he thong se uoc luong card nao dang nam o vung user muon tuong tac.

Khi pinch:

- card co `focusIndex` duoc scale lon hon
- card khac bi fade nhe

---

## 17. Vi sao dung `lerp`

`lerp(start, end, alpha)` la noi suy tuyen tinh.

Tinh nang nay dung `lerp` cho:

- rotation cua gallery root
- scale cua gallery
- rotation cua tung card
- opacity cua tung card

Neu khong co `lerp`:

- gallery se giat
- card nhay vi tri dot ngot
- trai nghiem thi giac se thieu "premium"

Dung `lerp` giup:

- motion mem
- phan ung nhanh nhung khong soc
- nhin dep hon trong bo cuc 3D

---

## 18. Responsive va resize

Component co ham `updateSize()` de:

- doc `clientWidth`, `clientHeight` cua mount container
- goi `renderer.setSize(...)`
- cap nhat `camera.aspect`
- `camera.updateProjectionMatrix()`

Va component dang:

- add event listener `resize`
- remove listener khi unmount

Nhu vay khi user doi kich thuoc cua browser, canvas 3D van phu hop.

---

## 19. Cleanup tai nguyen khi component unmount

Day la phan rat quan trong.

Khi user roi route hoac component bi huy, code se:

- cancel animation frame
- stop toan bo media tracks cua webcam
- close hand landmarker
- dispose geometry cua card
- dispose texture
- dispose material
- dispose renderer
- remove renderer DOM element

Neu bo qua cleanup:

- webcam co the van sang
- bo nho GPU/CPU co the bi giu lai
- chuyen route nhieu lan co the gay leak

Phan cleanup hien tai la mot diem tot cua implementation.

---

## 20. UX khi user khong du dieu kien

Tinh nang co 3 lop UX an toan:

### 20.1 Chua hydrate

- render `null`

Muc tieu:

- tranh mismatch giua server va client

### 20.2 Chua dang nhap

- redirect sang `/login`

### 20.3 Da dang nhap nhung sai role

- redirect sang `/dashboard`
- dong thoi component co fallback UI neu trong khoang chuyen tiep

Muc tieu:

- khong de user cam thay man hinh trang
- van giai thich duoc vi sao route nay la route rieng

---

## 21. Cac gia dinh dang ton tai trong code hien tai

Implementation hien tai dang dua tren cac gia dinh sau:

1. Backend tra `accessToken` dang JWT hop le.
2. Role duoc nhung trong payload JWT.
3. Role `ROLE_lover` ton tai that trong he thong auth.
4. Browser co ho tro:
   - WebGL
   - webcam
   - `navigator.mediaDevices`
5. User chap nhan webcam permission.
6. Moi truong mang cho phep load:
   - MediaPipe WASM
   - hand landmark model

Neu mot trong cac gia dinh nay khong dung, feature co the khong chay dung.

---

## 22. Gioi han hien tai

### 22.1 Chua dung image that

Gallery hien tai la texture duoc ve bang canvas, khong phai danh sach image that tu server hoac storage.

### 22.2 Role guard la client-side

Guard hien tai duoc thuc hien trong React client component.

Dieu nay co nghia:

- ve UX la du
- nhung ve security tuyet doi thi chua phai lop manh nhat

Neu muon chan manh hon, co the them:

- middleware
- server-side auth gate
- BFF/API-side authorization

### 22.3 Gesture detection dang la heuristic

Logic xac dinh open palm / peace / fist dang dua tren threshold thu cong.

No co the:

- sai tren mot so goc tay
- sai khi anh sang kem
- sai khi webcam chat luong thap

### 22.4 Dang phu thuoc CDN

Neu noi bo hoac production policy khong cho phep goi CDN runtime, feature se khong khoi tao duoc.

### 22.5 Chua co loading skeleton hoac retry flow chi tiet

Hien tai co thong diep text, nhung chua co workflow retry UX day du.

---

## 23. Huong mo rong tiep theo

### 23.1 Noi danh sach image that

Huong mo rong hop ly nhat:

- lay danh sach anh tu API
- map thanh cac `THREE.Texture`
- render card that thay vi canvas demo

Co the them:

- title
- caption
- id
- owner
- created time

### 23.2 Tach role guard thanh component tai su dung

Vi du:

- `RoleGuard`
- `AuthorizedByRole`

De dung lai cho cac route khac sau nay.

### 23.3 Dua MediaPipe assets ve local project

De tang do on dinh:

- host model trong `public/`
- host wasm neu can

Luc do feature it phu thuoc hon vao Internet/CDN.

### 23.4 Ho tro nhieu gesture hon

Vi du:

- swipe de doi bo anh
- 2 tay de scale toan gallery
- thumbs-up de freeze layout
- point de mo chi tiet 1 anh

### 23.5 Noi voi du lieu nghiep vu lover

Vi route nay danh cho `ROLE_lover`, co the bien no thanh mot trai nghiem dung nghia domain:

- album ky niem
- gallery anh cap doi
- wall hinh trai tim
- hand-controlled memory carousel

---

## 24. Tom tat kien truc theo mot cau chuyen ngan

Neu can giai thich nhanh cho nguoi moi:

1. Route `/feature-hand` render `FeatureHandExperience`.
2. Component nay doc auth state tu `AuthProvider`.
3. `AuthProvider` tach role tu JWT bang `role-utils.ts`.
4. Neu user co `ROLE_lover`, component moi cho khoi tao webcam + MediaPipe + Three.js.
5. MediaPipe doc ban tay tu webcam va tra landmarks.
6. Frontend bien landmarks thanh gesture state.
7. Gesture state dieu khien bo cuc, huong quay va zoom cua gallery 3D.
8. Khi roi man hinh, toan bo camera, renderer va tai nguyen duoc cleanup.

Day la mot feature theo huong:

- route-based
- client-only
- role-gated
- gesture-driven
- 3D interactive UI

---

## 25. Ket luan

`feature-hand` hien tai da dat duoc muc tieu demo ky thuat va trai nghiem:

- co route rieng
- co role guard `ROLE_lover`
- co hand tracking
- co bo cuc thay doi theo gesture
- co zoom/focus theo pinch
- co giao dien 3D bang Three.js

Ve mat kien truc, implementation hien tai du de tiep tuc mo rong.

Cac buoc hop ly tiep theo se la:

1. noi image that tu backend hoac cloud storage
2. chuyen role guard mot phan sang middleware/server layer
3. local-host MediaPipe assets
4. cai tien gesture classification de on dinh hon
5. bien feature nay thanh mot trai nghiem dung domain `lover` thay vi demo gallery tong quat

