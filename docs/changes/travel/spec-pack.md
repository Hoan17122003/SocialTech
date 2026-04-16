# Travel Spec Pack

## Tuyen bo nguon chan ly
- Tai lieu nay la Single Source of Truth cho change `travel`.
- Cac file khac trong `docs/changes/travel/` chi ho tro review, traceability, va quan ly Open Issues.

## Boi canh
San pham travel can tap trung vao nghiep vu cot loi giup traveler len ke hoach va dat cac thanh phan chinh cua chuyen di. Scope hien tai duoc khoa o ba nhom capability: dat noi luu tru, dat phuong tien di chuyen, va tiep can tien ich xung quanh.

## Business goals
- Cho phep traveler tim va dat noi luu tru phu hop voi nhu cau hanh trinh.
- Cho phep traveler tim va dat phuong tien di chuyen trong cac nhom da duoc neu: ve may bay, xe don, xe thue.
- Ho tro traveler nhan biet va tiep can tien ich xung quanh lien quan den diem den hoac noi luu tru.
- Tao mot pham vi product core du ro de cac buoc thiet ke tiep theo co the chi tiet hoa ma khong lam lech scope.

## In-scope
- Nghiep vu tim kiem, lua chon, va dat noi luu tru.
- Nghiep vu tim kiem, lua chon, va dat phuong tien di chuyen trong pham vi ve may bay, xe don, va xe thue.
- Kha nang hien thi, kham pha, hoac dieu huong den tien ich xung quanh o muc product capability.
- Dac ta actor, business flow, business rules cap cao, acceptance criteria, dependencies, constraints, va open issues.

## Out-of-scope
- Loyalty, membership, rewards, va referral.
- CMS, social feed, rating/review moderation, va noi dung cong dong.
- Quy trinh van hanh backoffice chi tiet.
- API contracts, schema du lieu, event model, va persistence design chi tiet.
- Tich hop chi tiet voi payment gateway, notification provider, inventory provider, hoac pricing engine.

## Actor/persona chinh
- Traveler
  Nguoi co nhu cau lap ke hoach chuyen di, so sanh lua chon, va thuc hien dat dich vu.
- Companion planner
  Nguoi ho tro traveler danh gia lua chon va ra quyet dinh dat, nhung khong can them business rule rieng trong scope hien tai.

## Capability map
### 1. Accommodation booking
- Traveler co the tim kiem noi luu tru dua tren diem den va thong tin hanh trinh.
- Traveler co the xem thong tin lua chon luu tru de ra quyet dinh dat.
- Traveler co the thuc hien booking intent cho lua chon luu tru da chon.

### 2. Transport booking
- Traveler co the tim kiem phuong tien di chuyen thuoc nhom ve may bay, xe don, hoac xe thue.
- Traveler co the xem thong tin lua chon di chuyen de ra quyet dinh dat.
- Traveler co the thuc hien booking intent cho phuong tien da chon.

### 3. Nearby utilities
- Traveler co the kham pha tien ich xung quanh lien quan den diem den hoac noi luu tru.
- He thong co the trinh bay thong tin tien ich xung quanh o muc ho tro quyet dinh chuyen di.
- Traveler co the su dung thong tin tien ich xung quanh de bo tro cho quyet dinh luu tru hoac di chuyen.

## End-to-end business flows
### Flow 1: Dat noi luu tru
1. Traveler xac dinh diem den va nhu cau chuyen di.
2. Traveler tim kiem cac lua chon noi luu tru phu hop.
3. Traveler xem thong tin lua chon de so sanh va chon mot noi luu tru.
4. Traveler thuc hien booking intent cho lua chon da chon.
5. He thong ghi nhan ket qua booking o muc nghiep vu. Cach xac nhan thanh cong chi tiet la Open Issue.

### Flow 2: Dat phuong tien di chuyen
1. Traveler xac dinh nhu cau di chuyen cho hanh trinh.
2. Traveler chon nhom phuong tien phu hop: ve may bay, xe don, hoac xe thue.
3. Traveler tim kiem va xem cac lua chon phuong tien di chuyen.
4. Traveler chon mot lua chon phu hop.
5. Traveler thuc hien booking intent cho phuong tien da chon.
6. He thong ghi nhan ket qua booking o muc nghiep vu. Chi tiet pricing, payment, va xac nhan la Open Issues.

### Flow 3: Kham pha tien ich xung quanh
1. Traveler xac dinh diem den, noi luu tru, hoac diem quan tam.
2. Traveler xem cac tien ich xung quanh lien quan.
3. Traveler su dung thong tin nay de dieu chinh quyet dinh dat luu tru hoac di chuyen.

## Business rules da duoc khoa
- Travel core trong change nay chi bao gom accommodation booking, transport booking, va nearby utilities.
- Transport booking trong scope hien tai chi neu ro ba nhom: ve may bay, xe don, xe thue.
- Tien ich xung quanh duoc dac ta o muc ho tro quyet dinh va hanh trinh; khong mac dinh bao gom booking cho cac tien ich do.
- Neu mot quyet dinh san pham chua co du thong tin tu prompt hoac context da doc, quyet dinh do phai duoc dua vao `Open Issues`.

## Acceptance criteria
### Accommodation booking
- Spec mo ta duoc muc tieu nghiep vu, actor chinh, va flow cap cao cho dat noi luu tru.
- Spec phan biet ro phan in-scope va out-of-scope cua accommodation booking.
- Spec khong tu y bo sung chinh sach gia, thanh toan, hoan huy, hay inventory model neu chua duoc khoa.

### Transport booking
- Spec mo ta duoc scope transport gom ve may bay, xe don, va xe thue.
- Spec mo ta duoc flow cap cao tu tim kiem den booking intent cho phuong tien di chuyen.
- Spec giu cac yeu to chua ro nhu pricing, payment, xac nhan booking, va provider sourcing o trang thai Open Issues.

### Nearby utilities
- Spec mo ta duoc vai tro cua nearby utilities trong viec bo tro quyet dinh hanh trinh.
- Spec khong mac dinh nearby utilities co quy trinh booking rieng neu chua duoc yeu cau.
- Spec lien ket nearby utilities voi accommodation hoac transport o muc ho tro business flow.

### Governance
- Toan bo change duoc tai lieu hoa duoi `docs/changes/travel/`.
- `spec-pack.md` co the doc doc lap ma van hieu duoc business scope va cac gioi han chinh.
- Moi noi dung chua chac chan deu duoc tro chieu sang `open-issues.md`.

## Dependencies and constraints
- Change nay phu thuoc vao viec duy tri living documents trong `docs/standards/` va `docs/architecture/`.
- Repo hien tai chua co travel domain implementation; spec nay khong duoc dung de suy ra san kien truc ky thuat chi tiet.
- Timebox `30 minute` gioi han muc do chi tiet o tang BA/product capability.

## Open Issues
- Mo hinh thanh toan cho accommodation va transport booking la gi?
- Chinh sach hoan huy, doi lich, va refund co nam trong release scope hay khong?
- Pham vi dia ly va ngon ngu/mui gio cua san pham la gi?
- Inventory se den tu nha cung cap nao va co can gom nhieu provider hay khong?
- Gia va availability co can realtime hay cho phep do tre nao?
- Dieu kien de mot booking duoc xem la xac nhan thanh cong la gi?
- Nearby utilities se chi la discovery information hay co deep-link / dat cho mot so utility trong tuong lai?
- Thu tu uu tien release giua accommodation, transport, va nearby utilities la nhu the nao?
