# Bắt đầu với DisNote Document Library

Tài liệu này dành cho người mới dùng React hoặc mới làm quen với document
editor. Bạn chưa cần biết BlockNote, migration, registry hay repository pattern.

Sau khi đọc xong, bạn sẽ hiểu:

- document là gì;
- block là gì;
- hàm nào tạo dữ liệu;
- component nào hiển thị giao diện;
- editor trả nội dung mới về ứng dụng như thế nào;
- dữ liệu nào cần lưu vào database.

## 1. Chỉ cần nhớ 5 khái niệm

| Khái niệm | Hiểu đơn giản |
|---|---|
| `DisNoteDocument` | Toàn bộ tài liệu, giống như một file Word |
| Block | Một mảnh nội dung: đoạn văn, tiêu đề, ảnh, bảng... |
| Builder | Hàm tạo dữ liệu, ví dụ `paragraph()` tạo một paragraph block |
| `DisNoteEditor` | Component React để người dùng nhập và sửa nội dung |
| `DocumentRenderer` | Component React chỉ để hiển thị tài liệu, không chỉnh sửa |

Luồng dữ liệu cơ bản:

```text
createDocument() ──► DisNoteDocument
                          │
                          ├──► DisNoteEditor: chỉnh sửa
                          │          │
                          │          └──► onDocumentChange(document mới)
                          │
                          └──► DocumentRenderer: chỉ hiển thị
```

Điều quan trọng nhất: **database lưu `DisNoteDocument`**, không lưu giao diện
React, HTML hay object nội bộ của BlockNote.

## 2. Hàm và component khác nhau thế nào?

### Hàm tạo dữ liệu

Bạn gọi hàm bằng dấu ngoặc:

```ts
const inlineText = text("Xin chào");
const titleBlock = heading(1, [inlineText]);
const document = createDocument({ blocks: [titleBlock] });
```

Các hàm trên không vẽ gì lên màn hình:

- `text("Xin chào")` tạo một đoạn chữ nhỏ;
- `heading(1, [...])` đặt chữ đó vào heading cấp 1;
- `createDocument(...)` đặt heading vào một document hoàn chỉnh.

Thứ tự lồng nhau là:

```text
Document
└── Heading block
    └── Text
```

### Component tạo giao diện

Component được viết dưới dạng JSX:

```tsx
<DocumentRenderer
  document={document}
  registry={articleRegistry}
/>
```

Component trên nhận dữ liệu qua props và vẽ document ra màn hình.

## 3. Ví dụ nhỏ nhất: tạo và hiển thị một document

### Bước 1: cài package

```bash
npm install @disnote/core react react-dom
```

### Bước 2: tạo document

Tạo file `src/my-document.ts`:

```ts
import {
  createDocument,
  heading,
  paragraph,
  text,
} from "@disnote/core";

export const myDocument = createDocument({
  metadata: {
    title: "Tài liệu đầu tiên",
    locale: "vi",
  },
  blocks: [
    heading(1, [text("Xin chào DisNote")]),
    paragraph([text("Đây là đoạn văn đầu tiên của tôi.")]),
  ],
});
```

Ý nghĩa từng hàm:

| Hàm | Nhận vào | Trả về | Dùng khi |
|---|---|---|---|
| `text("...")` | Chuỗi ký tự | Inline text | Muốn đặt chữ trong paragraph, heading... |
| `heading(1, [...])` | Cấp heading và nội dung | Heading block | Muốn tạo tiêu đề |
| `paragraph([...])` | Nội dung inline | Paragraph block | Muốn tạo đoạn văn |
| `createDocument({...})` | Metadata và danh sách block | `DisNoteDocument` | Muốn tạo một tài liệu hoàn chỉnh |

`heading(1, ...)` chỉ nhận cấp `1`, `2` hoặc `3`.

### Bước 3: hiển thị bằng React

```tsx
import { articleRegistry } from "@disnote/core";
import { DocumentRenderer } from "@disnote/core/renderer/react";
import { myDocument } from "./my-document";

export function ReadPage() {
  return (
    <DocumentRenderer
      document={myDocument}
      registry={articleRegistry}
    />
  );
}
```

Hai props bắt buộc:

| Prop | Ý nghĩa |
|---|---|
| `document` | Tài liệu cần hiển thị |
| `registry` | “Từ điển” cho renderer biết từng loại block hợp lệ |

Trong bài viết thông thường, cứ dùng `articleRegistry`. Bạn chưa cần tự tạo
registry.

## 4. Thêm editor để người dùng chỉnh sửa

### Bước 1: cài dependency editor

```bash
npm install @disnote/core \
  @blocknote/core@0.52.1 \
  @blocknote/react@0.52.1 \
  @blocknote/mantine@0.52.1 \
  @blocknote/xl-multi-column@0.52.1 \
  react react-dom
```

### Bước 2: tạo màn hình editor và preview

```tsx
import { useState } from "react";
import {
  articleRegistry,
  createDocument,
  heading,
  paragraph,
  text,
  type DisNoteDocument,
} from "@disnote/core";
import { DisNoteEditor } from "@disnote/core/editor/react";
import { DocumentRenderer } from "@disnote/core/renderer/react";

function createWelcomeDocument(): DisNoteDocument {
  return createDocument({
    metadata: { title: "Bản nháp", locale: "vi" },
    blocks: [
      heading(1, [text("Bản nháp của tôi")]),
      paragraph([text("Hãy thử sửa dòng này.")]),
    ],
  });
}

export function DocumentPage() {
  // Chỉ tạo document ban đầu một lần.
  const [initialDocument] = useState(createWelcomeDocument);

  // currentDocument luôn giữ nội dung mới nhất.
  const [currentDocument, setCurrentDocument] =
    useState<DisNoteDocument>(initialDocument);

  return (
    <main>
      <h2>Chỉnh sửa</h2>

      <DisNoteEditor
        initialDocument={initialDocument}
        onDocumentChange={setCurrentDocument}
      />

      <h2>Xem trước</h2>

      <DocumentRenderer
        document={currentDocument}
        registry={articleRegistry}
        mode="preview"
      />
    </main>
  );
}
```

Đây là phần quan trọng nhất:

```tsx
onDocumentChange={setCurrentDocument}
```

Khi người dùng gõ:

1. `DisNoteEditor` tạo một `DisNoteDocument` mới;
2. editor gọi `onDocumentChange(documentMới)`;
3. React chạy `setCurrentDocument(documentMới)`;
4. `DocumentRenderer` nhận document mới và render lại.

### Props của `DisNoteEditor`

| Prop | Bắt buộc | Dùng để làm gì? |
|---|---:|---|
| `initialDocument` | Có | Nội dung được nạp khi editor khởi động |
| `onDocumentChange` | Không | Nhận document mới mỗi khi người dùng chỉnh sửa |
| `editable` | Không | `false` để khóa chỉnh sửa |
| `theme` | Không | Chọn `"light"` hoặc `"dark"` |
| `className` | Không | Gắn CSS class cho vùng editor |

`initialDocument` có chữ “initial” vì nó chỉ là dữ liệu khởi tạo. Nếu prop này
thay đổi sau khi editor đã mount, editor không tự nạp lại document mới.

### Props thường dùng của `DocumentRenderer`

| Prop | Bắt buộc | Dùng để làm gì? |
|---|---:|---|
| `document` | Có | Document cần hiển thị |
| `registry` | Có | Danh sách định nghĩa block |
| `mode` | Không | `"preview"` hoặc `"published"` |
| `theme` | Không | Thay màu sắc renderer |
| `className` | Không | Gắn CSS class |
| `assetResolver` | Không | Đổi `assetId` thành URL ảnh/file |
| `referenceResolver` | Không | Tải dữ liệu cho reference block |

## 5. Lưu document

Library không tự chọn database. Bạn lấy document mới nhất và gửi nó tới API:

```tsx
async function saveDocument(document: DisNoteDocument) {
  const response = await fetch("/api/documents/" + document.id, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    throw new Error("Không lưu được document");
  }
}
```

Nút lưu:

```tsx
<button
  type="button"
  onClick={() => saveDocument(currentDocument)}
>
  Lưu
</button>
```

Giá trị cần lưu chính là `currentDocument`.

## 6. Đọc document từ API an toàn

Dữ liệu từ API hoặc database có thể hỏng. Hãy validate trước khi dùng:

```ts
import {
  articleRegistry,
  validateDocument,
} from "@disnote/core";

const response = await fetch("/api/documents/123");
const unknownData: unknown = await response.json();

const result = validateDocument(unknownData, {
  registry: articleRegistry,
});

if (!result.ok) {
  console.error(result.issues);
  throw new Error("Document trong database không hợp lệ");
}

const document = result.value;
```

`validateDocument()` không trả thẳng document vì validation có thể thất bại:

```text
result.ok === true   → dùng result.value
result.ok === false  → đọc result.issues
```

## 7. Builder nào dùng để tạo block nào?

Builder là các hàm giúp bạn không phải tự viết object JSON.

| Muốn tạo | Hàm |
|---|---|
| Chữ | `text()` |
| Link | `link()` |
| Mention user/channel | `mention()` |
| Reference | `reference()` |
| Đoạn văn | `paragraph()` |
| Tiêu đề | `heading()` |
| Danh sách chấm | `bulletListItem()` |
| Danh sách số | `numberedListItem()` |
| Checklist | `checklistItem()` |
| Toggle | `toggle()` |
| Trích dẫn | `quote()` |
| Code | `codeBlock()` |
| Ảnh | `image()` |
| Đường phân cách | `divider()` |
| Hộp thông báo | `callout()` |
| Block riêng của ứng dụng | `customBlock()` |

Ví dụ:

```ts
const blocks = [
  heading(1, [text("Hồ sơ dự án")]),
  callout([text("Tài liệu đang ở trạng thái bản nháp.")], "warning"),
  checklistItem([text("Viết phần giới thiệu")], true),
  checklistItem([text("Thêm hình ảnh")], false),
  codeBlock("console.log('Hello')", "javascript"),
];
```

## 8. Hàm thay đổi document

Các hàm transform không sửa document cũ. Chúng trả về kết quả chứa document
mới hoặc lỗi.

```ts
import {
  appendBlock,
  paragraph,
  text,
} from "@disnote/core";

const result = appendBlock(
  currentDocument,
  paragraph([text("Đoạn văn mới")]),
);

if (result.ok) {
  setCurrentDocument(result.document);
} else {
  console.error(result.error);
}
```

Không viết:

```ts
// Sai: result có thể là lỗi nên không phải lúc nào cũng có .document
const nextDocument = appendBlock(document, block).document;
```

Các transform thường dùng:

| Hàm | Tác dụng |
|---|---|
| `appendBlock()` | Thêm block vào cuối document |
| `insertBlock()` | Chèn block vào vị trí cụ thể |
| `updateBlock()` | Đổi props/content của một block |
| `replaceBlock()` | Thay toàn bộ block |
| `moveBlock()` | Di chuyển block |
| `removeBlock()` | Xóa block |
| `wrapBlocks()` | Bọc nhiều block trong một block cha |

Nếu người dùng đang nhập trực tiếp trong `DisNoteEditor`, editor đã xử lý các
thao tác này. Bạn chỉ cần gọi transform khi muốn thay đổi document bằng code.

## 9. Component nào dùng lúc nào?

| Component | Dùng khi |
|---|---|
| `DisNoteEditor` | Người dùng cần soạn thảo |
| `DocumentRenderer` | Cần hiển thị React nhưng không chỉnh sửa |
| `Toolbar` | Muốn tự xây toolbar riêng |
| `LinkEditor` | Muốn tự xây UI nhập/chỉnh sửa link |
| `ImageUploadButton` | Muốn gắn uploader riêng |
| `SlashMenu` | Muốn tự xây slash menu |
| `DocumentNativeRenderer` | Hiển thị trong React Native |

Người mới thường chỉ cần hai component:

```text
DisNoteEditor + DocumentRenderer
```

Không cần dùng `Toolbar`, `LinkEditor` hay `SlashMenu` riêng nếu UI mặc định của
editor đã đủ.

## 10. Chọn import path

| Việc cần làm | Import từ |
|---|---|
| Tạo/validate/thay đổi document | `@disnote/core` |
| Dùng editor React | `@disnote/core/editor/react` |
| Render React | `@disnote/core/renderer/react` |
| Render HTML ở backend | `@disnote/core/renderer/html` |
| Import/export Markdown, HTML | `@disnote/core/import-export` |
| Storage/revision contract | `@disnote/core/storage` |
| Comment | `@disnote/core/comments` |
| Collaboration Yjs | `@disnote/core/collaboration` |

Không import trực tiếp file nằm trong `dist/` hoặc `src/`.

## 11. Những API người mới chưa cần học

Bạn có thể bỏ qua các phần sau cho tới khi editor cơ bản đã chạy:

- custom registry;
- migration;
- storage repository contract;
- collaboration/Yjs;
- AI operations;
- Legal application service;
- custom block renderer;
- experimental editor access.

Lộ trình nên đi theo thứ tự:

1. tạo document;
2. render document;
3. thêm editor;
4. nhận document qua `onDocumentChange`;
5. lưu JSON qua API;
6. validate JSON khi đọc;
7. sau đó mới học revision, migration và collaboration.

## 12. Khi nào đọc tài liệu API đầy đủ?

Sau khi hoàn thành ví dụ editor + preview, đọc
[`HUONG_DAN_SU_DUNG.md`](HUONG_DAN_SU_DUNG.md) để tra cứu đầy đủ props, block,
storage, comments, collaboration và API nâng cao.

Nếu một thuật ngữ trong tài liệu này vẫn khó hiểu, hãy bắt đầu câu hỏi bằng một
tình huống cụ thể, ví dụ:

> Tôi có một trang React và muốn lưu nội dung editor vào MongoDB. Tôi cần dùng
> component và hàm nào?

Từ tình huống đó có thể xác định đúng API mà không cần học toàn bộ library trước.
