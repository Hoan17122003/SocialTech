# Travel Domain Overview

## Muc dich
- Cung cap boi canh domain cap cao cho product travel dang duoc dac ta.
- Lam ro boundary de tranh mo rong spec ngoai pham vi da khoa.

## Product scope cap cao
- Accommodation booking: tim kiem, danh gia lua chon, va dat noi luu tru.
- Transport booking: dat cac phuong tien di chuyen duoc neu trong scope hien tai, gom ve may bay, xe don, va xe thue.
- Nearby utilities: hien thi va ho tro tiep can cac tien ich xung quanh phuc vu hanh trinh.

## Bounded contexts muc toi thieu
- `Accommodation`
  Chiu trach nhiem cho inventory luu tru, thong tin phong/noi o, availability, va booking intent cua luu tru.
- `Transport Booking`
  Chiu trach nhiem cho inventory va booking intent cua ve may bay, xe don, va xe thue.
- `Nearby Utilities`
  Chiu trach nhiem cho viec phat hien, to chuc, va hien thi cac diem tien ich xung quanh diem den hoac noi luu tru.

## Actor chinh
- Traveler: nguoi tim kiem, so sanh, va dat dich vu.
- System admin/operations: ton tai o cap he thong nhung khong nam trong scope nghiep vu chi tiet cua change nay.
- External providers: nha cung cap inventory hoac du lieu bo sung. Cach ket noi chua duoc khoa trong change nay.

## Integration boundaries
- Payment, pricing engine, cancellation policy engine, CRM, loyalty, notification orchestration, va backoffice workflow deu chua duoc khoa trong change nay.
- Change hien tai chi yeu cau spec nghiep vu cap product; khong mo rong sang hop dong ky thuat hoac tich hop chi tiet.

## Glossary co so
- Accommodation booking: hanh dong dat noi luu tru cho mot hanh trinh.
- Transport booking: hanh dong dat phuong tien di chuyen trong hanh trinh.
- Nearby utility: diem dich vu ho tro quanh diem den hoac noi luu tru, vi du tien ich phuc vu chuyen di.

## Gioi han hien tai
- Chua co quyet dinh ve pham vi dia ly, mo hinh ton kho, chinh sach hoan huy, va muc do realtime cua gia/availability.
- Cac noi dung tren phai duoc ghi thanh `Open Issues` trong change cu the neu can de review.
