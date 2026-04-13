# Social Spec Pack

## Tuyen bo nguon chan ly
- Tai lieu nay la Single Source of Truth cho domain social core cua `SocialTech`.
- Muc tieu la dinh nghia domain nghiep vu ro rang truoc khi mo rong sang API, CQRS, event, hay chi tiet workflow.

## Boi canh
`SocialTech` can duoc tai thiet ke thanh mot social platform theo kieu community-driven nhu Reddit: nguoi dung tham gia cac cong dong theo chu de, tao post, thao luan qua comment, vote de xep hang noi dung, va moderation de giu chat luong.

## Business goals
- Cho phep xay dung feed noi dung dua tren cong dong va tuong tac cua user.
- Cho phep mo hinh hoa thao luan dang thread de tao gia tri cong dong.
- Cho phep moderation du manh de van hanh cong dong an toan.
- Tao domain model de doi backend co the implement bang Entity Framework mot cach ro rang va ben vung.

## In-scope
- User profile co ban.
- Community va community membership.
- Post text, link, media.
- Comment dang thread.
- Vote cho post va comment.
- Tag cho post.
- Report cho post/comment.
- Rule va visibility cua community.

## Out-of-scope
- Real-time chat.
- Private messaging.
- Notification orchestration.
- Ads, billing, subscription.
- Recommendation engine chi tiet.
- Search engine ranking algorithm chi tiet.

## Actor chinh
- `Guest`
- `User`
- `Moderator`
- `Owner`

## Capability map
### 1. Identity
- Dang ky user va quan ly profile co ban.
- Theo doi reputation score o muc tong quan.

### 2. Community
- Tao va quan ly community.
- Quan ly visibility, membership, vai tro.
- Cong bo va sap xep rule.

### 3. Content
- Tao post thuoc community.
- Gan tag cho post.
- Dinh kem media cho post.
- Tao comment va reply comment.

### 4. Engagement
- Vote cho post.
- Vote cho comment.
- Tong hop score, comment count, member count.

### 5. Moderation
- Bao cao post hoac comment.
- Gan moderator xu ly report.
- Theo doi report status.

## End-to-end business flows
### Flow 1: Tham gia community va dang bai
1. User tao tai khoan.
2. User tham gia mot community.
3. User tao mot post trong community do.
4. He thong luu thong tin post, tag, media neu co.
5. Feed co the dung score, thoi gian, va visibility de hien thi bai.

### Flow 2: Thao luan
1. User mo mot post.
2. User tao comment goc hoac tra loi comment khac.
3. He thong luu quan he cha-con cua comment.
4. Cac user khac vote va tiep tuc reply.

### Flow 3: Moderation
1. User report mot post hoac comment.
2. He thong tao `ContentReport` trong community lien quan.
3. Moderator nhan xu ly, review, va cap nhat status.
4. Noi dung co the bi an boi tac gia hoac boi moderator tuy theo quyet dinh van hanh.

## Business rules da duoc khoa
- Community la don vi to chuc trung tam cua he thong.
- Post khong ton tai ngoai community.
- Comment khong ton tai ngoai post.
- Membership la noi luu role trong community.
- Moi user chi co toi da mot vote tren moi post hoac comment.
- Report phai co mot va chi mot target noi dung.

## Acceptance criteria
### Community
- Domain mo ta ro community, membership, role, rule, visibility.

### Content
- Domain mo ta ro post, comment, media, tag, va quan he giua chung.

### Engagement
- Domain mo ta ro vote va score cho post/comment.

### Moderation
- Domain mo ta ro report, moderator assignment, va report status.

### Persistence
- Cac entity co the map sang Entity Framework ma khong can suy luan them ve khoa ngoai hay quan he co ban.

## Dependencies and constraints
- Uu tien model de doc, de bao tri, va de mo rong hon la optimize som.
- Chua dua vao domain cac logic ranking phuc tap hoac anti-abuse engine.
- Khong dua chi tiet API contract vao tai lieu nay.

## Open Issues
- Co can ho tro community `restricted join approval` chi tiet hon khong?
- Co can them `saved posts`, `user follow`, va `direct message` trong phase tiep theo khong?
- Score se la truong tong hop duoc cap nhat dong bo hay tinh toan tu vote khi query?
- Co can tach moderation thanh bounded context rieng o tang implementation khong?
