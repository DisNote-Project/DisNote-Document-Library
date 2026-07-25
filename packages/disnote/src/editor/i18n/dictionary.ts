/** Editor localization. Full-sentence keys — never concatenate translated fragments. */

export type EditorLocale = "en" | "vi";

export interface EditorDictionary {
  "toolbar.bold": string;
  "toolbar.italic": string;
  "toolbar.underline": string;
  "toolbar.strike": string;
  "toolbar.code": string;
  "toolbar.link": string;
  "toolbar.image": string;
  "slash.paragraph": string;
  "slash.heading1": string;
  "slash.heading2": string;
  "slash.heading3": string;
  "slash.bulletList": string;
  "slash.numberedList": string;
  "slash.checklist": string;
  "slash.quote": string;
  "slash.code": string;
  "slash.divider": string;
  "slash.callout": string;
  "placeholder.empty": string;
  "link.enterUrl": string;
  "link.apply": string;
  "upload.dropOrClick": string;
  "upload.uploading": string;
  "upload.failed": string;
  "a11y.blockMenu": string;
  "a11y.dragHandle": string;
}

const en: EditorDictionary = {
  "toolbar.bold": "Bold",
  "toolbar.italic": "Italic",
  "toolbar.underline": "Underline",
  "toolbar.strike": "Strikethrough",
  "toolbar.code": "Inline code",
  "toolbar.link": "Insert link",
  "toolbar.image": "Insert image",
  "slash.paragraph": "Text",
  "slash.heading1": "Heading 1",
  "slash.heading2": "Heading 2",
  "slash.heading3": "Heading 3",
  "slash.bulletList": "Bulleted list",
  "slash.numberedList": "Numbered list",
  "slash.checklist": "Checklist",
  "slash.quote": "Quote",
  "slash.code": "Code block",
  "slash.divider": "Divider",
  "slash.callout": "Callout",
  "placeholder.empty": "Type '/' for commands",
  "link.enterUrl": "Enter a URL",
  "link.apply": "Apply",
  "upload.dropOrClick": "Drop an image or click to upload",
  "upload.uploading": "Uploading…",
  "upload.failed": "Upload failed",
  "a11y.blockMenu": "Block options",
  "a11y.dragHandle": "Drag to move block",
};

const vi: EditorDictionary = {
  "toolbar.bold": "Đậm",
  "toolbar.italic": "Nghiêng",
  "toolbar.underline": "Gạch chân",
  "toolbar.strike": "Gạch ngang",
  "toolbar.code": "Mã nội dòng",
  "toolbar.link": "Chèn liên kết",
  "toolbar.image": "Chèn ảnh",
  "slash.paragraph": "Văn bản",
  "slash.heading1": "Tiêu đề 1",
  "slash.heading2": "Tiêu đề 2",
  "slash.heading3": "Tiêu đề 3",
  "slash.bulletList": "Danh sách chấm",
  "slash.numberedList": "Danh sách số",
  "slash.checklist": "Danh sách kiểm",
  "slash.quote": "Trích dẫn",
  "slash.code": "Khối mã",
  "slash.divider": "Đường kẻ",
  "slash.callout": "Ghi chú",
  "placeholder.empty": "Gõ '/' để mở lệnh",
  "link.enterUrl": "Nhập một URL",
  "link.apply": "Áp dụng",
  "upload.dropOrClick": "Thả ảnh hoặc bấm để tải lên",
  "upload.uploading": "Đang tải lên…",
  "upload.failed": "Tải lên thất bại",
  "a11y.blockMenu": "Tùy chọn khối",
  "a11y.dragHandle": "Kéo để di chuyển khối",
};

const DICTIONARIES: Record<EditorLocale, EditorDictionary> = { en, vi };

export type EditorMessageKey = keyof EditorDictionary;

export interface I18n {
  locale: EditorLocale;
  t(key: EditorMessageKey): string;
}

export function createI18n(locale: EditorLocale = "en"): I18n {
  const dict = DICTIONARIES[locale] ?? en;
  return { locale, t: (key) => dict[key] };
}
