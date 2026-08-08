# Mentor guide: Refactor News Feed, Chatbox và FAB UI từ A-Z

Tài liệu này giải thích toàn bộ phần UI/UX vừa được xử lý ở frontend:

- News feed hiển thị bài viết, hình ảnh, nút chi tiết, reaction, comment và menu hành động.
- Reaction picker mở bằng hover theo từng bài viết.
- Chatbox xử lý tin nhắn dài, menu sửa/xóa, biệt danh, cảm xúc mặc định và quick reaction.
- Floating Action Button (FAB) nằm bên trái và tooltip bung sang phải.

Mục tiêu của tài liệu không chỉ là ghi lại “đã sửa gì”, mà còn giúp bạn hiểu tại sao lại code như vậy. Mình sẽ giải thích theo kiểu mentor cho người mới bắt đầu học FE/Next.js: đi từ khái niệm, luồng tư duy, code mẫu, lỗi thường gặp, rồi các hướng xử lý khác.

---

## 1. Bức tranh tổng quan: vì sao UI này cần refactor?

Khi làm frontend, một UI tốt không chỉ là “nhìn đẹp”. Nó cần thỏa nhiều điều kiện:

- Dữ liệu dài không làm vỡ layout.
- Người dùng luôn thấy được nút thao tác quan trọng.
- Hover/click hoạt động đúng kỳ vọng.
- Menu/popup không bị tràn khỏi vùng hiển thị.
- Component đọc được, bảo trì được.
- Logic tương tác không bị lẫn giữa các item trong danh sách.

Trong đợt xử lý này, các vấn đề chính là:

1. News feed chưa hiển thị bài viết giống một social feed dễ dùng.
2. Ảnh trong bài viết cần được nhận diện từ `attachments` và render hợp lý.
3. Nút “Xem chi tiết” chỉ nên hiện khi bài có nội dung detail.
4. Reaction picker ban đầu dễ mở sai hoặc giữ nhiều list cùng lúc nếu chỉ dùng CSS hover.
5. Chatbox bị vỡ khi tin nhắn quá dài.
6. Nút options của tin nhắn có thể bị đẩy ra khỏi vùng thao tác.
7. FAB đặt bên trái nhưng tooltip lại bung sang trái, dễ bị khuất khỏi màn hình.

---

## 2. File nào tham gia vào phần này?

### 2.1 News feed

File chính:

```txt
src/features/articles/components/news-composer.tsx
```

Vai trò:

- Gọi API lấy danh sách bài viết.
- Render danh sách bài dạng feed.
- Phân loại attachment thành ảnh và file.
- Xử lý reaction, comment, save, hide, delete.
- Chỉ hiển thị nút detail khi bài có nội dung.

### 2.2 Chatbox

File chính:

```txt
src/features/chat/components/floating-chat-box.tsx
```

Vai trò:

- Render từng message.
- Gửi, sửa, xóa message.
- Xử lý tin nhắn dài tự xuống dòng.
- Hiển thị menu options cho tin nhắn của mình.
- Cho phép đặt biệt danh và chọn cảm xúc mặc định.
- Quick reaction gửi ngay emoji mặc định.

### 2.3 FAB navigation

File chính:

```txt
src/shared/layout/app-shell.tsx
src/app/globals.css
```

Vai trò:

- `app-shell.tsx` render danh sách nút con của FAB.
- `globals.css` điều khiển animation speed-dial của FAB.
- Tooltip của nút con hiện ở bên phải vì FAB nằm bên trái.

---

## 3. Kiến thức nền tảng cho người mới học FE/Next.js

### 3.1 Component là gì?

Trong React/Next.js, UI được chia thành các component nhỏ.

Ví dụ đơn giản:

```tsx
function Button() {
    return <button>Click me</button>;
}
```

Khi component cần tương tác như click, hover, nhập text, mở menu, ta thường cần state.

```tsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

`count` là dữ liệu hiện tại.  
`setCount` là hàm cập nhật dữ liệu.  
Khi state đổi, React render lại UI.

### 3.2 Vì sao các file này có `'use client'`?

Các component như News feed và Chatbox có:

- `useState`
- `useEffect`
- `onClick`
- `onMouseEnter`
- `window.confirm`
- textarea input

Đây là các tương tác chạy trên browser. Với Next.js App Router, component có tương tác client-side cần khai báo:

```tsx
'use client';
```

Nếu không có dòng này, Next.js có thể xem component là Server Component và bạn sẽ gặp lỗi khi dùng hook hoặc event handler.

### 3.3 State theo từng item trong danh sách

Khi render danh sách bài viết, mỗi bài có `article.id`.

Nếu muốn bài nào react riêng bài đó, không thể chỉ dùng một boolean kiểu:

```tsx
const [isOpen, setIsOpen] = useState(false);
```

Vì `isOpen = true` không nói rõ “bài nào đang mở”.

Cách đúng hơn là lưu ID bài đang active:

```tsx
const [openReactionArticleId, setOpenReactionArticleId] = useState<number | null>(null);
```

Khi hover bài số 10:

```tsx
setOpenReactionArticleId(10);
```

Khi render từng bài:

```tsx
const isReactionPickerOpen = openReactionArticleId === article.id;
```

Như vậy hover bài nào thì chỉ bài đó mở.

---

## 4. News feed: thiết kế lại bài viết theo kiểu social feed

### 4.1 Tư duy UI

Một post card dễ dùng thường có cấu trúc:

```txt
+------------------------------------------------+
| Avatar + Tên tác giả + thời gian        ...    |
|                                                |
| Tiêu đề bài viết                               |
| Nội dung ngắn                                  |
|                                                |
| Ảnh / media                                    |
|                                                |
| 12 cảm xúc                         3 bình luận |
|------------------------------------------------|
| React        Bình luận        Xem chi tiết     |
+------------------------------------------------+
```

Lý do chọn cấu trúc này:

- Người dùng quét thông tin nhanh từ trên xuống dưới.
- Avatar/tác giả ở đầu giúp biết bài của ai.
- Media nằm giữa để nổi bật.
- Các action nằm cuối để tương tác sau khi đọc.
- Menu `...` nằm góc phải theo thói quen social app.

### 4.2 Phân biệt ảnh và file trong `attachments`

Trong contract hiện tại:

```ts
export type ArticleDetail = {
    title: string;
    content: string;
    attachments: string[];
    isPermissionEdit: boolean;
    createDate: string;
    nameAuthor: string;
    publicIdAuthor: string;
    avatarAuthor: string;
};
```

`attachments` chỉ là mảng string. Nó có thể chứa:

- Link ảnh.
- Link file PDF/doc.
- Link khác.

Ta cần phân loại:

```ts
function isImageUrl(url: string) {
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url) || url.includes('images.unsplash.com');
}

function getImageAttachments(article: BasicArticle) {
    return (article.attachments || []).filter(isImageUrl);
}

function getFileAttachments(article: BasicArticle) {
    return (article.attachments || []).filter((attachment) => !isImageUrl(attachment));
}
```

Giải thích:

- Regex `\.(png|jpe?g|...)` kiểm tra đuôi file ảnh.
- `(\?.*)?` cho phép URL có query string như `image.jpg?w=1200`.
- `images.unsplash.com` là trường hợp demo/fallback vì ảnh Unsplash thường không có đuôi `.jpg` rõ ràng.

Cách khác có thể làm:

```ts
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
```

Nhưng cách này chỉ dùng được nếu backend trả MIME type. Hiện backend chỉ trả string URL nên FE phải đoán từ URL.

### 4.3 Render ảnh dạng grid

Code ý tưởng:

```tsx
function ArticleMedia({ article }: { article: BasicArticle }) {
    const images = getImageAttachments(article);

    if (!images.length) {
        return <div>Bài này chưa có hình ảnh đính kèm.</div>;
    }

    const visibleImages = images.slice(0, 4);

    return (
        <div className={visibleImages.length === 1 ? '' : 'grid grid-cols-2'}>
            {visibleImages.map((image, index) => (
                <a key={image} href={image} target="_blank" rel="noreferrer">
                    <img src={image} alt={`${article.title} - hình ${index + 1}`} />
                </a>
            ))}
        </div>
    );
}
```

Vì sao chỉ lấy 4 ảnh?

- Nếu bài có nhiều ảnh, render hết sẽ làm card quá dài.
- Social feed thường preview 1–4 ảnh, phần còn lại có thể hiện `+N`.
- Người dùng có thể click ảnh để mở full URL.

### 4.4 Vì sao dùng `<img>` thay vì `next/image`?

Next.js có component `next/image` giúp tối ưu ảnh, nhưng với ảnh remote cần cấu hình domain trong `next.config.ts`.

Nếu backend trả nhiều nguồn ảnh khác nhau mà chưa cấu hình domain, dùng `next/image` có thể lỗi.

Vì vậy ở feed này chọn:

```tsx
<img src={image} loading="lazy" />
```

Ưu điểm:

- Đơn giản.
- Không cần cấu hình domain.
- Phù hợp với dữ liệu attachment chưa ổn định.

Nhược điểm:

- Không tối ưu mạnh bằng `next/image`.
- Không tự resize/optimize.

Khi backend/media domain ổn định, ta có thể nâng cấp sang `next/image`.

---

## 5. Nút “Xem chi tiết”: chỉ hiện khi bài có detail

Yêu cầu: nếu bài viết có phần detail thì mới có nút click sang chi tiết. Bài bình thường chỉ react/comment.

Ta dùng nội dung đã làm sạch:

```ts
function getPlainText(content?: string) {
    return (content || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#>*_`~\-[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
```

Sau đó:

```tsx
const preview = getPlainText(article.content);
const hasDetail = Boolean(article.id && preview);
```

Render:

```tsx
{hasDetail ? (
    <Link href={`/articles/${article.id}`}>
        Xem chi tiết
    </Link>
) : (
    <span>Không có detail</span>
)}
```

Tại sao không luôn hiện nút?

- Nếu bài không có nội dung detail, click vào sẽ làm người dùng hụt hẫng.
- UX tốt là chỉ hiển thị action khi action đó có ý nghĩa.
- Cách này cũng giảm lỗi route detail trống.

Cách khác:

- Backend trả field `hasDetail: boolean`.
- Backend trả `articleType: 'QuickPost' | 'Article'`.
- FE không cần tự đoán từ `content`.

Nếu backend có thể sửa contract, cách backend trả `hasDetail` sẽ rõ ràng hơn.

---

## 6. Menu `...` của News: save, hide, delete

Menu 3 chấm dùng state:

```ts
const [openMenuArticleId, setOpenMenuArticleId] = useState<number | null>(null);
```

Mở/tắt menu:

```tsx
onClick={() =>
    setOpenMenuArticleId((current) =>
        current === article.id ? null : article.id,
    )
}
```

Ý nghĩa:

- Nếu đang mở menu của chính bài đó thì click lần nữa đóng.
- Nếu đang mở bài khác thì chuyển sang bài hiện tại.

Click outside:

```tsx
useEffect(() => {
    if (!openMenuArticleId) return;

    const closeMenu = (event: PointerEvent) => {
        if (!(event.target instanceof Element) || !event.target.closest('[data-news-actions]')) {
            setOpenMenuArticleId(null);
        }
    };

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
}, [openMenuArticleId]);
```

Giải thích cho newbie:

- Khi menu mở, ta lắng nghe click trên toàn document.
- Nếu click không nằm trong vùng có `data-news-actions`, ta đóng menu.
- Khi menu đóng hoặc component unmount, ta gỡ listener để tránh memory leak.

Delete chỉ hiện nếu:

```tsx
{article.isPermissionEdit && (
    <button>Xóa bài viết</button>
)}
```

Lý do:

- User không phải chủ bài thì không được thấy action nguy hiểm.
- Backend vẫn phải kiểm tra quyền, nhưng FE cũng nên ẩn UI không phù hợp.

---

## 7. Reaction picker của News: hover đúng bài nào, mở đúng bài đó

### 7.1 Vấn đề ban đầu

Nếu dùng CSS hover đơn giản:

```tsx
<div className="group">
    <button>React</button>
    <div className="opacity-0 group-hover:opacity-100">
        ...
    </div>
</div>
```

Nó dễ gặp vấn đề:

- Có khoảng trống giữa nút và list, rê chuột lên list thì list biến mất.
- Nếu dùng group ở vùng quá rộng, hover nhầm có thể làm nhiều list hiện.
- Không dễ thêm delay đóng mượt.

### 7.2 Giải pháp đã chọn

Dùng state theo `article.id`:

```ts
const [openReactionArticleId, setOpenReactionArticleId] = useState<number | null>(null);
const reactionCloseTimerRef = useRef<number | null>(null);
```

Mở picker:

```ts
const openReactionPicker = (articleId: number) => {
    if (reactionCloseTimerRef.current) {
        window.clearTimeout(reactionCloseTimerRef.current);
    }
    setOpenReactionArticleId(articleId);
};
```

Đóng picker có delay:

```ts
const scheduleCloseReactionPicker = () => {
    if (reactionCloseTimerRef.current) {
        window.clearTimeout(reactionCloseTimerRef.current);
    }

    reactionCloseTimerRef.current = window.setTimeout(() => {
        setOpenReactionArticleId(null);
    }, 260);
};
```

Render từng bài:

```tsx
const isReactionPickerOpen = openReactionArticleId === article.id;
```

Chỉ render picker nếu đúng bài đang active:

```tsx
{isReactionPickerOpen && (
    <div className="absolute bottom-12 left-0 z-20 flex gap-1">
        {REACTIONS.map((reaction) => (
            <button key={reaction}>{reaction}</button>
        ))}
    </div>
)}
```

Đây là điểm quan trọng: không chỉ ẩn bằng opacity, mà các bài khác không render picker luôn.

Vì sao cách này tốt?

- Hover bài nào chỉ bài đó có picker trong DOM.
- Không có chuyện nhiều popover cùng bắt pointer event.
- Dễ kiểm soát delay đóng.
- Dễ debug vì state nói rõ article nào đang active.

### 7.3 Bridge vô hình là gì?

Khi popup nằm phía trên nút:

```txt
[reaction list]

   khoảng trống

[React button]
```

Nếu có khoảng trống nhỏ, chuột rời khỏi button trước khi vào list, hover sẽ mất.

Ta thêm một vùng vô hình nối giữa button và list:

```tsx
<span
    aria-hidden="true"
    className="absolute bottom-8 left-0 z-10 h-5 w-full pointer-events-auto"
/>
```

Nó không hiển thị nhưng vẫn là vùng hover/pointer.  
Người dùng rê chuột qua khoảng đó thì vẫn được xem là đang trong vùng active.

### 7.4 Click nút React để reset

Yêu cầu mới: click nút chính không mở list nữa, mà bỏ reaction về mặc định.

Code:

```ts
const clearArticleReaction = (articleId: number) => {
    setReactionByArticleId((current) => {
        const next = { ...current };
        delete next[articleId];
        return next;
    });
};
```

Render:

```tsx
<button
    type="button"
    onClick={() => clearArticleReaction(article.id)}
    aria-pressed={Boolean(selectedReaction)}
>
    {selectedReaction || '👍'} {selectedReaction ? 'Đã react' : 'Like'}
</button>
```

Tại sao dùng `delete next[articleId]`?

- `reactionByArticleId` là object lưu reaction theo ID.
- Nếu xóa key của bài, bài đó quay về trạng thái chưa react.

Ví dụ:

```ts
{
    101: '❤️',
    102: '😂'
}
```

Clear bài `101` thành:

```ts
{
    102: '😂'
}
```

---

## 8. Chatbox: xử lý tin nhắn dài không vỡ layout

### 8.1 Vấn đề

Tin nhắn dài kiểu:

```txt
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

Không có khoảng trắng nên browser có thể không tự xuống dòng theo cách ta muốn.

Nếu không xử lý, bubble sẽ tràn ngang, đẩy layout, che nút options.

### 8.2 CSS xử lý xuống dòng

Ta dùng:

```tsx
className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
```

Giải thích:

- `whitespace-pre-wrap`: giữ xuống dòng người dùng nhập nhưng vẫn cho wrap.
- `break-words`: cho phép bẻ dòng từ dài.
- `overflow-wrap:anywhere`: mạnh hơn, cho phép browser bẻ dòng ở bất kỳ điểm nào nếu cần.

Ví dụ:

```tsx
<span className="block min-w-0 break-words [overflow-wrap:anywhere]">
    {msg.content}
</span>
```

Vì sao cần `min-w-0`?

Trong flexbox, item có thể không chịu co nhỏ nếu thiếu `min-w-0`. Đây là lỗi rất phổ biến với người mới học CSS flex.

Nói đơn giản:

- Parent là flex.
- Child chứa text dài.
- Nếu child không có `min-w-0`, nó có thể cố giữ width nội dung và làm tràn.

---

## 9. Chatbox: nút options sửa/xóa không bị đẩy khỏi UI

### 9.1 Vấn đề

Tin nhắn của mình có bubble và nút 3 chấm:

```txt
[bubble dài dài dài dài dài] [...]
```

Nếu bubble được phép chiếm toàn bộ width, nút `...` bị đẩy ra ngoài hoặc menu bị khuất.

### 9.2 Cách đã xử lý

Row của tin nhắn mình:

```tsx
className={`group flex min-w-0 items-center gap-1 ${
    isMe
        ? 'w-full max-w-[92%] flex-row-reverse justify-start'
        : 'max-w-[92%]'
}`}
```

Bubble của tin nhắn mình:

```tsx
className={`relative min-w-0 rounded-2xl ... ${
    isMe
        ? 'max-w-[calc(100%-2.25rem)] bg-[var(--accent)] text-white'
        : 'max-w-full bg-[var(--background-soft)]'
}`}
```

Action lane:

```tsx
<div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
    <button>...</button>
</div>
```

Giải thích:

- Row rộng tối đa 92% khung chat.
- Bubble chỉ được chiếm `100% - 2.25rem`.
- `2.25rem` tương đương khoảng 36px, đủ chỗ cho nút 3 chấm và gap.
- Nút options có lane riêng `h-8 w-8`.
- `shrink-0` giúp lane không bị co lại.

Tư duy layout:

```txt
Tổng row = 92% khung chat

+-----------------------------------------+
| [lane options 32px] [bubble còn lại]     |
+-----------------------------------------+
```

Vì vậy tin nhắn dài phải wrap trong bubble, không được ăn mất chỗ của nút.

### 9.3 Menu mở vào trong khung chat

Trước đó menu có thể neo kiểu:

```tsx
className="absolute bottom-8 right-0"
```

Với tin nhắn nằm bên phải, `right-0` có thể làm menu tràn khỏi vùng thao tác.

Đổi sang:

```tsx
className="absolute bottom-8 left-0"
```

Vì action lane đang nằm phía trong row, menu sẽ mở vào phía trong khung chat dễ thao tác hơn.

---

## 10. Chatbox: settings popover, biệt danh và cảm xúc mặc định

### 10.1 State local cho chat settings

```ts
const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
const [nickname, setNickname] = useState('');
const [defaultReaction, setDefaultReaction] = useState('👍');
```

Giải thích:

- `isChatSettingsOpen`: menu cài đặt đang mở hay đóng.
- `nickname`: biệt danh hiển thị local trong chatbox.
- `defaultReaction`: emoji mặc định để gửi nhanh.

Hiện tại các state này là local UI state, tức là reload trang sẽ mất. Nếu muốn lưu lâu dài, cần backend hoặc localStorage.

### 10.2 Click outside để đóng menu

```tsx
<div className="relative" data-chat-room-options>
    ...
</div>
```

Effect:

```ts
useEffect(() => {
    if (!isChatSettingsOpen) return;

    const closeSettings = (event: PointerEvent) => {
        if (!(event.target instanceof Element) || !event.target.closest('[data-chat-room-options]')) {
            setIsChatSettingsOpen(false);
        }
    };

    document.addEventListener('pointerdown', closeSettings);
    return () => document.removeEventListener('pointerdown', closeSettings);
}, [isChatSettingsOpen]);
```

Kỹ thuật này rất hay dùng cho:

- Dropdown.
- Modal nhỏ.
- Context menu.
- Popover.

---

## 11. Quick reaction trong chat: click emoji là gửi luôn

### 11.1 Vấn đề

Ban đầu click emoji mặc định chỉ append emoji vào textarea:

```ts
setInputText((current) => `${current}${defaultReaction}`);
```

Nhưng yêu cầu là click emoji thì gửi luôn, giống nút reaction nhanh trong chat app.

### 11.2 Tách helper gửi tin nhắn

Nếu form submit và quick reaction đều gửi message, không nên copy-paste logic.

Ta tách helper:

```ts
const sendChatText = async (rawText: string, options?: { clearComposer?: boolean }) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
        await sendMessage(conversationKey, text);
        if (options?.clearComposer) {
            setInputText('');
        }
    } finally {
        setIsSending(false);
    }
};
```

Form submit:

```ts
const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendChatText(inputText, { clearComposer: true });
};
```

Quick reaction:

```ts
const handleDefaultReactionSend = async () => {
    await sendChatText(defaultReaction);
};
```

Button:

```tsx
<button
    type="button"
    disabled={isSending}
    onClick={() => void handleDefaultReactionSend()}
>
    {defaultReaction}
</button>
```

Vì sao cách này tốt?

- Một nơi quản lý logic gửi.
- Không bị lệch behavior giữa gửi text và gửi emoji.
- `isSending` chống double click.
- Quick reaction không xóa nội dung user đang gõ dở trong textarea.

---

## 12. FAB bên trái: tooltip phải bung sang phải

### 12.1 Vấn đề

FAB được đặt:

```css
.fab-container {
    position: fixed;
    bottom: 24px;
    left: 24px;
}
```

Nếu tooltip dùng `right-14`, label sẽ bung sang trái:

```tsx
<span className="absolute right-14">...</span>
```

Vì FAB nằm sát cạnh trái, tooltip có thể ra khỏi viewport.

### 12.2 Cách sửa

Đổi sang:

```tsx
<span className="absolute left-14">
    {item.label}
</span>
```

Tư duy:

```txt
Màn hình trái
|
| [FAB item]  [Tooltip bung sang phải]
|
```

Kỹ thuật dùng `group-hover`:

```tsx
<div className="group relative">
    <span className="opacity-0 group-hover:opacity-100">
        Label
    </span>
    <Link>Icon</Link>
</div>
```

Giải thích:

- `group` đặt ở parent.
- Child dùng `group-hover:...`.
- Khi hover parent, child đổi style.

---

## 13. Những lỗi thường gặp và cách debug

### 13.1 Text vẫn tràn dù đã có `break-words`

Kiểm tra parent có phải flex không. Nếu có, thêm:

```tsx
className="min-w-0"
```

Ở cả row và bubble nếu cần.

### 13.2 Popover bị mất khi rê chuột lên list

Nguyên nhân thường là có khoảng trống giữa trigger và popup.

Cách xử lý:

- Thêm bridge vô hình.
- Dùng state + delay close.
- Đặt popup sát hơn trigger.

### 13.3 Nhiều popover mở cùng lúc

Đừng dùng boolean chung:

```ts
const [isOpen, setIsOpen] = useState(false);
```

Hãy lưu ID:

```ts
const [openId, setOpenId] = useState<number | null>(null);
```

Render:

```tsx
{openId === item.id && <Popover />}
```

### 13.4 Menu bị tràn khỏi khung chat

Kiểm tra:

- Menu đang neo `left-0` hay `right-0`.
- Parent có `overflow-hidden` không.
- Menu nằm trong container có đủ width không.
- Nút action có lane riêng chưa.

### 13.5 Click outside đóng menu nhưng click bên trong cũng bị đóng

Dùng `closest()` với data attribute:

```tsx
<div data-menu-root>
    ...
</div>
```

```ts
if (!event.target.closest('[data-menu-root]')) {
    closeMenu();
}
```

---

## 14. Các hướng xử lý khác và vì sao chưa chọn

### 14.1 Dùng thư viện popover như Radix UI

Ưu điểm:

- Accessibility tốt.
- Tự xử lý focus, escape, positioning.
- Ít bug hover/click outside.

Nhược điểm:

- Cần thêm dependency.
- Project hiện đang dùng UI custom nhẹ.
- Với nhu cầu hiện tại, tự xử lý đủ đơn giản.

Khi UI phức tạp hơn, Radix UI là lựa chọn tốt.

### 14.2 Dùng Floating UI để tự tính vị trí menu

Ưu điểm:

- Tự flip menu nếu gần mép màn hình.
- Tự shift để không overflow viewport.
- Phù hợp tooltip/popover chuyên nghiệp.

Nhược điểm:

- Thêm dependency và learning curve.
- Với chatbox nhỏ, ta chỉ cần đổi anchor và chừa lane là đủ.

### 14.3 Persist nickname/default reaction xuống backend

Hiện tại:

```ts
const [nickname, setNickname] = useState('');
const [defaultReaction, setDefaultReaction] = useState('👍');
```

Chỉ là state local.

Nếu muốn lưu thật:

- Thêm API update chat preference.
- Backend lưu vào DB.
- FE load preference khi mở conversation.

Ví dụ contract tương lai:

```ts
type ChatPreference = {
    conversationKey: string;
    nickname?: string;
    defaultReaction?: string;
};
```

### 14.4 Backend trả rõ media type

Hiện FE đoán ảnh bằng URL. Tốt hơn backend trả:

```ts
type Attachment = {
    url: string;
    type: 'Image' | 'File';
    fileName?: string;
};
```

Lúc đó FE không cần regex:

```ts
const images = attachments.filter((item) => item.type === 'Image');
```

Đây là hướng clean hơn cho lâu dài.

---

## 15. Checklist khi bạn tự làm một UI tương tự

Khi làm một post card hoặc chatbox, hãy tự hỏi:

- Dữ liệu dài có làm vỡ layout không?
- Component trong list có state riêng theo ID chưa?
- Menu/popup có bị tràn khỏi container không?
- Hover có khoảng trống làm mất popup không?
- Click outside có đóng menu đúng không?
- Action nguy hiểm như delete có kiểm tra quyền chưa?
- UI có fallback khi thiếu ảnh/avatar/content không?
- Logic gửi/request có chống double submit không?
- Comment trong code có giải thích lý do, không chỉ mô tả code không?

---

## 16. Tóm tắt tư duy quan trọng

Nếu bạn mới học FE/Next.js, hãy nhớ các ý này:

1. UI list nên dùng state theo `id`, không dùng boolean chung.
2. Text dài trong flexbox cần `min-w-0` và `overflow-wrap:anywhere`.
3. Popover hover mượt cần vùng active liền mạch và delay đóng.
4. Menu trong khung nhỏ cần tính hướng mở để không tràn UI.
5. Dữ liệu backend chưa rõ thì FE cần fallback an toàn.
6. `use client` cần thiết khi component có state/event/browser API.
7. Logic lặp lại như gửi message nên tách helper dùng chung.
8. Comment tốt nên trả lời “vì sao làm vậy”, không chỉ “đoạn này làm gì”.

---

## 17. Bài tập tự luyện

Nếu muốn hiểu sâu hơn, bạn có thể tự thử:

### Bài 1: Thêm reaction count thật

Hiện count đang là metric giả ổn định. Hãy thiết kế contract:

```ts
type ArticleReactionSummary = {
    total: number;
    currentUserReaction?: string;
};
```

Sau đó render count từ backend.

### Bài 2: Lưu default reaction

Thử lưu `defaultReaction` vào `localStorage`:

```ts
localStorage.setItem('chat.defaultReaction', defaultReaction);
```

Và load lại khi component mount.

### Bài 3: Tạo reusable `PopoverMenu`

Tách logic click outside thành component dùng lại:

```tsx
function PopoverMenu({ open, onClose, children }) {
    // click outside logic
    return open ? <div>{children}</div> : null;
}
```

Khi làm được bài này, bạn sẽ hiểu rõ hơn cách component hóa UI trong React.

