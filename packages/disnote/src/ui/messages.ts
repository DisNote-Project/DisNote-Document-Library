export const UI_MESSAGES = {
  en: {
    attachment: "Attachment",
    addPage: "Create page", pages: "Pages", trash: "Trash", movePage: "Move page", source: "Shared source", editSource: "Edit shared content",
    loading: "Loading…", failed: "Unable to load content", retry: "Retry", empty: "No records", add: "Add record", remove: "Delete", save: "Save", cancel: "Cancel",
    previous: "Previous", next: "Next", search: "Search", title: "Title", record: "Record", edit: "Edit record", value: "Value", ungrouped: "Ungrouped", unavailable: "Content unavailable",
    table: "Table", board: "Board", list: "List", gallery: "Gallery", calendar: "Calendar", timeline: "Timeline", map: "Map",
    addComment: "Add comment", reply: "Reply", resolve: "Resolve", reopen: "Reopen", comments: "Comments", orphaned: "Original content was removed", history: "Version history", restore: "Restore", compare: "Compare",
    online: "Connected", offline: "Offline", conflict: "A newer version exists. Your local changes have been kept.", syncing: "Synchronizing…", synced: "All changes saved", aiPrompt: "Describe the change", aiGenerate: "Generate preview", aiApply: "Apply changes", aiPreview: "Preview changes", breadcrumb: "Page path",
    unknown: "Unsupported block", syncedBlock: "Synced content", template: "Template button", database: "Database", toc: "Table of contents", noHeadings: "No headings", untitledHeading: "Untitled heading", print: "Print or save as PDF",
  },
  vi: {
    attachment: "Tệp đính kèm",
    addPage: "Tạo trang", pages: "Trang", trash: "Thùng rác", movePage: "Di chuyển trang", source: "Nguồn dùng chung", editSource: "Sửa nội dung dùng chung",
    loading: "Đang tải…", failed: "Không thể tải nội dung", retry: "Thử lại", empty: "Chưa có bản ghi", add: "Thêm bản ghi", remove: "Xóa", save: "Lưu", cancel: "Hủy",
    previous: "Trước", next: "Sau", search: "Tìm kiếm", title: "Tiêu đề", record: "Bản ghi", edit: "Sửa bản ghi", value: "Giá trị", ungrouped: "Chưa phân nhóm", unavailable: "Nội dung không khả dụng",
    table: "Bảng", board: "Bảng Kanban", list: "Danh sách", gallery: "Bộ sưu tập", calendar: "Lịch", timeline: "Dòng thời gian", map: "Bản đồ",
    addComment: "Thêm bình luận", reply: "Trả lời", resolve: "Giải quyết", reopen: "Mở lại", comments: "Bình luận", orphaned: "Nội dung gốc đã bị xóa", history: "Lịch sử phiên bản", restore: "Khôi phục", compare: "So sánh",
    online: "Đã kết nối", offline: "Ngoại tuyến", conflict: "Đã có phiên bản mới hơn. Thay đổi trên thiết bị vẫn được giữ lại.", syncing: "Đang đồng bộ…", synced: "Đã lưu mọi thay đổi", aiPrompt: "Mô tả thay đổi", aiGenerate: "Tạo bản xem trước", aiApply: "Áp dụng thay đổi", aiPreview: "Xem trước thay đổi", breadcrumb: "Đường dẫn trang",
    unknown: "Khối chưa được hỗ trợ", syncedBlock: "Nội dung đồng bộ", template: "Nút mẫu", database: "Cơ sở dữ liệu", toc: "Mục lục", noHeadings: "Chưa có tiêu đề", untitledHeading: "Tiêu đề chưa đặt tên", print: "In hoặc lưu PDF",
  },
} as const;
export type UIMessageKey = keyof typeof UI_MESSAGES.en;
export function uiMessages(locale = "en"): Record<UIMessageKey, string> {
  return UI_MESSAGES[locale.toLowerCase().split("-")[0] === "vi" ? "vi" : "en"];
}
