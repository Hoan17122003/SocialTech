# Phase 0 Bootstrap Guide

## Muc tieu
- Xac nhan repo da co du nen tai lieu de mo mot thay doi moi ma khong phai suy doan.
- Thiet lap quy tac luu tru tai lieu de moi deliverable deu duoc tim thay tai mot noi ro rang.
- Bao dam moi change co mot Single Source of Truth truoc khi di vao implementation.

## Repo readiness criteria
Repo duoc xem la san sang mo spec moi khi thoa tat ca dieu kien sau:
- Co `docs/changes/<change>/spec-pack.md` dong vai tro Single Source of Truth cho change.
- Co tai lieu living docs can thiet duoi `docs/architecture/` va `docs/standards/`.
- Co tai lieu Phase 0 ghi nhan hien trang va gap neu day la lan dau bootstrap docs.
- Moi diem mo ho, quyet dinh chua khoa, hoac pham vi chua ro deu duoc dua vao `Open Issues`, khong tron vao requirement chinh thuc.

## Single Source of Truth
- Doi voi moi thay doi, nguon chan ly duy nhat la `docs/changes/<change>/spec-pack.md`.
- Cac file khac trong `docs/changes/<change>/` chi dong vai tro ho tro review, traceability, va quan ly open issues.
- `docs/architecture/` va `docs/standards/` la living documents, dung de tai su dung boi canh va quy chuan dung chung, khong thay the spec-pack.

## Vi tri luu deliverables
- Deliverable theo tung thay doi: `docs/changes/<change>/`
- Living documents ve kien truc: `docs/architecture/`
- Living documents ve quy chuan/spec authoring: `docs/standards/`
- Tai lieu kiem tra readiness va hien trang bootstrap: `docs/maintenance/phase0/`

## Quy trinh mo change moi
1. Doc `docs/maintenance/phase0/` de xac nhan repo readiness va cac gap hien huu.
2. Doc `docs/standards/` va `docs/architecture/` de dung dung template, thuat ngu, va boundary.
3. Tao `docs/changes/<change>/spec-pack.md` va ghi ro pham vi, business goals, acceptance criteria, va open issues.
4. Chi bo sung requirement khi co co so ro rang tu prompt, context da doc, hoac quyet dinh da duoc khoa.
5. Neu thieu thong tin, ghi thanh `Open Issues`; khong duoc tu y day chi tiet bang gia dinh.

## Ap dung cho travel change
- Change hien tai: `travel`
- Scope duoc khoa: nghiep vu cot loi dat noi luu tru, dat phuong tien di chuyen, va tien ich xung quanh.
- Ngoai pham vi neu chua co yeu cau bo sung: loyalty, CMS, social feed, moderation, backoffice operations, API contract chi tiet, va data schema chi tiet.
