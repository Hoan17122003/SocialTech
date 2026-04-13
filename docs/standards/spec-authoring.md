# Spec Authoring Standard

## Muc dich
- Dam bao cac spec co cau truc nhat quan, de review, de trace, va khong pha vo Single Source of Truth.

## Nguyen tac bat buoc
- Moi change phai co `docs/changes/<change>/spec-pack.md` la nguon chan ly duy nhat.
- Deliverable cua mot change chi duoc luu duoi `docs/changes/<change>/`.
- Khong dua chi tiet ky thuat, schema, hoac workflow van hanh vao spec neu chua duoc yeu cau ro rang.
- Khong duoc tu y mo rong scope. Moi diem mo ho phai dua vao `Open Issues`.

## Cau truc toi thieu cho spec-pack
- Boi canh va business goals
- In-scope / out-of-scope
- Actor/persona chinh
- Capability map
- End-to-end business flows
- Business rules da duoc khoa
- Feature-level acceptance criteria
- Dependencies / constraints
- Open Issues

## Cach viet assumptions va open issues
- Assumptions chi duoc ghi khi can lam ro boi canh da biet; khong dung assumptions de bien noi dung chua du thong tin thanh requirement.
- Open Issues phai o dang cau hoi hoac quyet dinh con treo.
- Moi Open Issue nen neu ro tac dong den scope, UX, hoac implementation neu chua duoc giai dap.

## Cach viet acceptance criteria
- O muc feature hoac capability, khong di xuong muc API contract hoac DB schema neu chua can.
- Tap trung vao ket qua nghiep vu co the review duoc.
- Moi acceptance criterion phai lien ket ro voi capability hoac business goal.

## Traceability
- Nen co bang mapping giua business goal, capability, business rule, acceptance criteria, va open issue.
- Traceability document la tai lieu ho tro review; neu co mau thuan voi `spec-pack.md`, uu tien `spec-pack.md`.
