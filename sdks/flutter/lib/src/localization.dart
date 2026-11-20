import 'package:flutter/widgets.dart';

import 'constants.dart';

@immutable
final class DisNoteMessages {
  const DisNoteMessages({
    required this.loadingEditor,
    required this.editorTitle,
    required this.editorUnavailable,
    required this.retry,
    required this.unknownBlock,
    required this.tableOfContents,
    required this.noHeadings,
    required this.untitledHeading,
    required this.breadcrumb,
    required this.unavailable,
    required this.syncedContent,
    required this.templateButton,
    required this.database,
    required this.attachment,
    required this.download,
    required this.openLink,
    required this.imageUnavailable,
    required this.mediaUnavailable,
    required this.diagram,
    required this.checked,
    required this.notChecked,
  });

  final String loadingEditor;
  final String editorTitle;
  final String editorUnavailable;
  final String retry;
  final String unknownBlock;
  final String tableOfContents;
  final String noHeadings;
  final String untitledHeading;
  final String breadcrumb;
  final String unavailable;
  final String syncedContent;
  final String templateButton;
  final String database;
  final String attachment;
  final String download;
  final String openLink;
  final String imageUnavailable;
  final String mediaUnavailable;
  final String diagram;
  final String checked;
  final String notChecked;

  static const DisNoteMessages en = DisNoteMessages(
    loadingEditor: 'Loading editor…',
    editorTitle: 'DisNote document editor',
    editorUnavailable: 'The document editor is unavailable.',
    retry: 'Retry',
    unknownBlock: 'Unsupported block',
    tableOfContents: 'Table of contents',
    noHeadings: 'No headings',
    untitledHeading: 'Untitled heading',
    breadcrumb: 'Breadcrumb',
    unavailable: 'Unavailable',
    syncedContent: 'Synced content',
    templateButton: 'Template button',
    database: 'Database',
    attachment: 'Attachment',
    download: 'Download',
    openLink: 'Open link',
    imageUnavailable: 'Image unavailable',
    mediaUnavailable: 'Media unavailable',
    diagram: 'Diagram',
    checked: 'Checked',
    notChecked: 'Not checked',
  );

  static const DisNoteMessages vi = DisNoteMessages(
    loadingEditor: 'Đang tải trình soạn thảo…',
    editorTitle: 'Trình soạn thảo tài liệu DisNote',
    editorUnavailable: 'Không thể mở trình soạn thảo tài liệu.',
    retry: 'Thử lại',
    unknownBlock: 'Khối chưa được hỗ trợ',
    tableOfContents: 'Mục lục',
    noHeadings: 'Không có tiêu đề',
    untitledHeading: 'Tiêu đề chưa đặt tên',
    breadcrumb: 'Đường dẫn phân cấp',
    unavailable: 'Không khả dụng',
    syncedContent: 'Nội dung đồng bộ',
    templateButton: 'Nút mẫu',
    database: 'Cơ sở dữ liệu',
    attachment: 'Tệp đính kèm',
    download: 'Tải xuống',
    openLink: 'Mở liên kết',
    imageUnavailable: 'Không thể hiển thị ảnh',
    mediaUnavailable: 'Không thể phát nội dung',
    diagram: 'Sơ đồ',
    checked: 'Đã chọn',
    notChecked: 'Chưa chọn',
  );

  static DisNoteMessages forLocale(String locale) =>
      locale == DisNoteLocales.vietnamese ? vi : en;
}
