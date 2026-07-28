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
  "a11y.slashCommands": string;
  "slash.results": string;
  "slash.noMatches": string;
  "group.advanced": string;
  "group.headings": string;
  "group.data": string;
  "custom.callout.title": string;
  "custom.callout.subtext": string;
  "custom.math.title": string;
  "custom.math.subtext": string;
  "custom.bookmark.title": string;
  "custom.bookmark.subtext": string;
  "custom.columns2.title": string;
  "custom.columns2.subtext": string;
  "custom.columns3.title": string;
  "custom.columns3.subtext": string;
  "custom.toc.title": string;
  "custom.toc.subtext": string;
  "custom.breadcrumb.title": string;
  "custom.breadcrumb.subtext": string;
  "custom.syncedBlock.title": string;
  "custom.syncedBlock.subtext": string;
  "custom.templateButton.title": string;
  "custom.templateButton.subtext": string;
  "custom.toggleHeading1.title": string;
  "custom.toggleHeading1.subtext": string;
  "custom.toggleHeading2.title": string;
  "custom.toggleHeading2.subtext": string;
  "custom.toggleHeading3.title": string;
  "custom.toggleHeading3.subtext": string;
  "custom.tableView.title": string;
  "custom.tableView.subtext": string;
  "custom.boardView.title": string;
  "custom.boardView.subtext": string;
  "custom.listView.title": string;
  "custom.listView.subtext": string;
  "custom.galleryView.title": string;
  "custom.galleryView.subtext": string;
  "custom.calendarView.title": string;
  "custom.calendarView.subtext": string;
  "custom.timelineView.title": string;
  "custom.timelineView.subtext": string;
  "custom.mapView.title": string;
  "custom.mapView.subtext": string;
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
  "a11y.slashCommands": "Slash commands",
  "slash.results": "{{count}} results",
  "slash.noMatches": "No matches",
  "group.advanced": "Advanced",
  "group.headings": "Headings",
  "group.data": "Data",
  "custom.callout.title": "Callout",
  "custom.callout.subtext": "Highlight a tip, note or warning",
  "custom.math.title": "Math Equation",
  "custom.math.subtext": "Render a LaTeX mathematical equation",
  "custom.bookmark.title": "Web Bookmark",
  "custom.bookmark.subtext": "Embed a link preview card",
  "custom.columns2.title": "2 Columns",
  "custom.columns2.subtext": "Create a 2-column layout",
  "custom.columns3.title": "3 Columns",
  "custom.columns3.subtext": "Create a 3-column layout",
  "custom.toc.title": "Table of Contents",
  "custom.toc.subtext": "Generate outline from headings",
  "custom.breadcrumb.title": "Breadcrumb",
  "custom.breadcrumb.subtext": "Show current page hierarchy path",
  "custom.syncedBlock.title": "Synced Block",
  "custom.syncedBlock.subtext": "Keep contents synced across pages",
  "custom.templateButton.title": "Template Button",
  "custom.templateButton.subtext": "Create a reusable duplication button",
  "custom.toggleHeading1.title": "Toggle Heading 1",
  "custom.toggleHeading1.subtext": "Toggle section with H1 size",
  "custom.toggleHeading2.title": "Toggle Heading 2",
  "custom.toggleHeading2.subtext": "Toggle section with H2 size",
  "custom.toggleHeading3.title": "Toggle Heading 3",
  "custom.toggleHeading3.subtext": "Toggle section with H3 size",
  "custom.tableView.title": "Table View",
  "custom.tableView.subtext": "Insert an inline database table view",
  "custom.boardView.title": "Board View",
  "custom.boardView.subtext": "Insert an inline kanban board view",
  "custom.listView.title": "List View",
  "custom.listView.subtext": "Insert an inline list database view",
  "custom.galleryView.title": "Gallery View",
  "custom.galleryView.subtext": "Insert a gallery database view",
  "custom.calendarView.title": "Calendar View",
  "custom.calendarView.subtext": "Insert a calendar database view",
  "custom.timelineView.title": "Timeline View",
  "custom.timelineView.subtext": "Insert a timeline database view",
  "custom.mapView.title": "Map View",
  "custom.mapView.subtext": "Insert a map database view",
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
  "slash.bulletList": "Danh sách dấu đầu dòng",
  "slash.numberedList": "Danh sách đánh số",
  "slash.checklist": "Danh sách kiểm tra",
  "slash.quote": "Trích dẫn",
  "slash.code": "Khối mã",
  "slash.divider": "Đường kẻ",
  "slash.callout": "Ghi chú",
  "placeholder.empty": "Gõ '/' để mở lệnh",
  "link.enterUrl": "Nhập URL",
  "link.apply": "Áp dụng",
  "upload.dropOrClick": "Thả ảnh hoặc bấm để tải lên",
  "upload.uploading": "Đang tải lên…",
  "upload.failed": "Tải lên thất bại",
  "a11y.blockMenu": "Tùy chọn khối",
  "a11y.dragHandle": "Kéo để di chuyển khối",
  "a11y.slashCommands": "Lệnh dấu gạch chéo",
  "slash.results": "{{count}} kết quả",
  "slash.noMatches": "Không có kết quả",
  "group.advanced": "Nâng cao",
  "group.headings": "Tiêu đề",
  "group.data": "Dữ liệu",
  "custom.callout.title": "Khung ghi chú",
  "custom.callout.subtext": "Làm nổi bật mẹo, ghi chú hoặc cảnh báo",
  "custom.math.title": "Phương trình toán học",
  "custom.math.subtext": "Hiển thị phương trình toán học LaTeX",
  "custom.bookmark.title": "Dấu trang web",
  "custom.bookmark.subtext": "Nhúng thẻ xem trước liên kết",
  "custom.columns2.title": "2 cột",
  "custom.columns2.subtext": "Tạo bố cục 2 cột",
  "custom.columns3.title": "3 cột",
  "custom.columns3.subtext": "Tạo bố cục 3 cột",
  "custom.toc.title": "Mục lục",
  "custom.toc.subtext": "Tạo dàn ý từ các tiêu đề",
  "custom.breadcrumb.title": "Đường dẫn phân cấp",
  "custom.breadcrumb.subtext": "Hiển thị đường dẫn phân cấp của trang hiện tại",
  "custom.syncedBlock.title": "Khối đồng bộ",
  "custom.syncedBlock.subtext": "Đồng bộ nội dung giữa các trang",
  "custom.templateButton.title": "Nút mẫu",
  "custom.templateButton.subtext": "Tạo nút nhân bản có thể tái sử dụng",
  "custom.toggleHeading1.title": "Tiêu đề thu gọn 1",
  "custom.toggleHeading1.subtext": "Mục thu gọn với cỡ H1",
  "custom.toggleHeading2.title": "Tiêu đề thu gọn 2",
  "custom.toggleHeading2.subtext": "Mục thu gọn với cỡ H2",
  "custom.toggleHeading3.title": "Tiêu đề thu gọn 3",
  "custom.toggleHeading3.subtext": "Mục thu gọn với cỡ H3",
  "custom.tableView.title": "Dạng bảng",
  "custom.tableView.subtext": "Chèn chế độ xem cơ sở dữ liệu dạng bảng",
  "custom.boardView.title": "Dạng bảng công việc",
  "custom.boardView.subtext": "Chèn chế độ xem bảng Kanban",
  "custom.listView.title": "Dạng danh sách",
  "custom.listView.subtext": "Chèn chế độ xem cơ sở dữ liệu dạng danh sách",
  "custom.galleryView.title": "Dạng thư viện",
  "custom.galleryView.subtext": "Chèn chế độ xem cơ sở dữ liệu dạng thư viện",
  "custom.calendarView.title": "Dạng lịch",
  "custom.calendarView.subtext": "Chèn chế độ xem cơ sở dữ liệu dạng lịch",
  "custom.timelineView.title": "Dạng dòng thời gian",
  "custom.timelineView.subtext":
    "Chèn chế độ xem cơ sở dữ liệu dạng dòng thời gian",
  "custom.mapView.title": "Dạng bản đồ",
  "custom.mapView.subtext": "Chèn chế độ xem cơ sở dữ liệu dạng bản đồ",
};

const DICTIONARIES: Record<EditorLocale, EditorDictionary> = { en, vi };

export type EditorMessageKey = keyof EditorDictionary;

export interface I18n {
  locale: EditorLocale;
  t(key: EditorMessageKey, params?: Record<string, string | number>): string;
}

export function createI18n(locale: EditorLocale = "en"): I18n {
  const dict = DICTIONARIES[locale] ?? en;
  return {
    locale,
    t: (key, params = {}) =>
      Object.entries(params).reduce(
        (message, [name, value]) =>
          message.replaceAll(`{{${name}}}`, String(value)),
        dict[key]
      ),
  };
}
