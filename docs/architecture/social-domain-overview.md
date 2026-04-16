# Social Domain Overview

## Muc dich
- Dinh nghia domain nghiep vu cot loi cho `SocialTech` theo mo hinh social community tuong tu Reddit.
- Tao mot boundary ro rang de team business, backend, va data cung nhin cung mot ngon ngu.

## Tu duy product
- San pham xoay quanh cac cong dong theo chu de.
- Nguoi dung tham gia cong dong, dang bai, binh luan, va vote de tao thuc chat cho feed.
- Moderation la mot phan cot loi, khong phai phan mo rong.

## Bounded contexts de xuat
- `Identity`
  Quan ly tai khoan nguoi dung, ho so co ban, diem uy tin, va trang thai xac thuc.
- `Community`
  Quan ly cong dong, rule, thanh vien, vai tro moderator/owner, va visibility.
- `Content`
  Quan ly post, media, tag, comment, va cau truc thread comment.
- `Engagement`
  Quan ly upvote/downvote, dem diem bai viet, diem binh luan, va chi so tuong tac.
- `Moderation`
  Quan ly report, hang doi review, va ket qua xu ly noi dung vi pham.

## Actor chinh
- `Guest`: xem mot phan noi dung cong khai.
- `User`: tao post, comment, vote, tham gia cong dong.
- `Moderator`: duyet report, xoa/an noi dung, quan ly thanh vien trong cong dong.
- `Owner`: tao cong dong, dinh nghia rule, bo nhiem moderator.

## Aggregate roots chinh
- `User`
  Thuc the dai dien cho danh tinh social va trang thai co ban cua nguoi dung.
- `Community`
  Trung tam cua nghiep vu. Moi post deu thuoc mot community.
- `Post`
  Don vi noi dung chinh tren feed. Ho tro bai text, link, va media.
- `Comment`
  Don vi thao luan theo dang tree, cho phep reply long nhau.
- `ContentReport`
  Don vi moderation de moderator xu ly cac noi dung bi bao cao.

## Quy tac domain can giu ro
- Moi `Post` phai thuoc dung mot `Community`.
- Moi `Comment` phai thuoc dung mot `Post`.
- Vote la duy nhat theo cap `User + Post` hoac `User + Comment`.
- Thanh vien trong community duoc quan ly rieng qua `CommunityMembership`, khong dat role truc tiep tren `User`.
- Rule cua community duoc tach thanh `CommunityRule` de de quan ly va hien thi.
- Report chi tro vao mot muc tieu tai mot thoi diem: `Post` hoac `Comment`.

## Gia tri cua model nay
- De doc: ten entity trung voi ngon ngu nghiep vu.
- De mo rong: co san cho moderation, media, membership, va voting.
- De ORM hoa: quan he 1-n, n-n, self-reference deu ro rang cho Entity Framework.
