abstract final class DisNoteContract {
  static const String documentFormat = 'disnote-document';
  static const int schemaVersion = 1;
  static const int bridgeVersion = 1;
  static const int maxBridgeBytes = 5000000;
  static const String defaultApiPrefix = '/api/v1';
  static const String documentChannelsPath = 'document-channels';
}

abstract final class DisNoteBridgeKind {
  static const String ready = 'ready';
  static const String document = 'document';
  static const String initialize = 'initialize';
  static const String editable = 'editable';
}

abstract final class DisNoteBlockType {
  static const String paragraph = 'paragraph';
  static const String heading = 'heading';
  static const String bulletListItem = 'bulletListItem';
  static const String numberedListItem = 'numberedListItem';
  static const String toggle = 'toggle';
  static const String checklistItem = 'checklistItem';
  static const String quote = 'quote';
  static const String codeBlock = 'codeBlock';
  static const String image = 'image';
  static const String divider = 'divider';
  static const String callout = 'callout';
  static const String table = 'table';
  static const String math = 'math';
  static const String tableOfContents = 'tableOfContents';
  static const String breadcrumb = 'breadcrumb';
  static const String syncedBlock = 'syncedBlock';
  static const String templateButton = 'templateButton';
  static const String toggleHeading1 = 'toggleHeading1';
  static const String toggleHeading2 = 'toggleHeading2';
  static const String toggleHeading3 = 'toggleHeading3';
  static const String bookmark = 'bookmark';
  static const String video = 'video';
  static const String audio = 'audio';
  static const String file = 'file';
  static const String tableDb = 'tableDb';
  static const String board = 'board';
  static const String listDb = 'listDb';
  static const String gallery = 'gallery';
  static const String calendar = 'calendar';
  static const String timeline = 'timeline';
  static const String map = 'map';
  static const String columnList = 'columnList';
  static const String column = 'column';
  static const String diagram = 'diagram';

  static const Set<String> core = <String>{
    paragraph,
    heading,
    bulletListItem,
    numberedListItem,
    toggle,
    checklistItem,
    quote,
    codeBlock,
    image,
    divider,
    callout,
    table,
    math,
    tableOfContents,
    breadcrumb,
    syncedBlock,
    templateButton,
    toggleHeading1,
    toggleHeading2,
    toggleHeading3,
    bookmark,
    video,
    audio,
    file,
    tableDb,
    board,
    listDb,
    gallery,
    calendar,
    timeline,
    map,
    columnList,
    column,
    diagram,
  };
}

abstract final class DisNoteMarkType {
  static const String bold = 'bold';
  static const String italic = 'italic';
  static const String underline = 'underline';
  static const String strike = 'strike';
  static const String code = 'code';
  static const String textColor = 'textColor';
  static const String backgroundColor = 'backgroundColor';
}

abstract final class DisNoteInlineType {
  static const String text = 'text';
  static const String link = 'link';
  static const String mention = 'mention';
  static const String reference = 'reference';
}

abstract final class DisNoteLocales {
  static const String english = 'en';
  static const String vietnamese = 'vi';
  static const Set<String> supported = <String>{english, vietnamese};
}
