import 'dart:convert';

import 'constants.dart';
import 'errors.dart';
import 'model.dart';
import 'validation.dart';

sealed class DisNoteEditorMessage {
  const DisNoteEditorMessage();

  factory DisNoteEditorMessage.parse(String source) {
    if (source.length > DisNoteContract.maxBridgeBytes) {
      throw const DisNoteBridgeException('mobile editor message is too large');
    }
    final Object? decoded;
    try {
      decoded = jsonDecode(source);
    } on FormatException {
      throw const DisNoteBridgeException(
        'mobile editor message is not valid JSON',
      );
    }
    if (decoded is! Map<String, Object?> ||
        decoded['version'] != DisNoteContract.bridgeVersion) {
      throw const DisNoteBridgeException(
        'mobile editor protocol version is invalid',
      );
    }
    final Object? kind = decoded['kind'];
    if (kind == DisNoteBridgeKind.ready) return const DisNoteEditorReady();
    if (kind == DisNoteBridgeKind.document) {
      final Object? rawDocument = decoded['document'];
      if (rawDocument is! Map<String, Object?>) {
        throw const DisNoteBridgeException('document message has no document');
      }
      final DisNoteDocument document;
      try {
        document = DisNoteDocument.fromJson(rawDocument);
      } on DisNoteFormatException {
        throw const DisNoteBridgeException('document message is malformed');
      }
      if (!DisNoteValidator.validate(document).isValid) {
        throw const DisNoteBridgeException(
          'document message failed validation',
        );
      }
      return DisNoteEditorDocument(document);
    }
    throw const DisNoteBridgeException('mobile editor message kind is invalid');
  }
}

final class DisNoteEditorReady extends DisNoteEditorMessage {
  const DisNoteEditorReady();
}

final class DisNoteEditorDocument extends DisNoteEditorMessage {
  const DisNoteEditorDocument(this.document);
  final DisNoteDocument document;
}

sealed class DisNoteEditorCommand {
  const DisNoteEditorCommand();
  Map<String, Object?> toJson();

  String toJavaScript() {
    final String encoded = jsonEncode(jsonEncode(toJson()))
        .replaceAll(' ', r'\u2028')
        .replaceAll(' ', r'\u2029');
    return "window.dispatchEvent(new MessageEvent('message',{data:$encoded}));true;";
  }
}

final class DisNoteInitializeEditor extends DisNoteEditorCommand {
  const DisNoteInitializeEditor(
    this.document, {
    required this.editable,
    required this.locale,
  });
  final DisNoteDocument document;
  final bool editable;
  final String locale;
  @override
  Map<String, Object?> toJson() => <String, Object?>{
    'version': DisNoteContract.bridgeVersion,
    'kind': DisNoteBridgeKind.initialize,
    'document': document.toJson(),
    'editable': editable,
    'locale': locale,
  };
}

final class DisNoteSetEditable extends DisNoteEditorCommand {
  const DisNoteSetEditable(this.editable);
  final bool editable;
  @override
  Map<String, Object?> toJson() => <String, Object?>{
    'version': DisNoteContract.bridgeVersion,
    'kind': DisNoteBridgeKind.editable,
    'editable': editable,
  };
}

abstract final class DisNoteFlutterBridgeScript {
  static const String install = '''
(function () {
  const host = window.DisNoteFlutter;
  if (!host || typeof host.postMessage !== 'function') return false;
  window.ReactNativeWebView = Object.freeze({postMessage: function (data) {
    if (typeof data === 'string') host.postMessage(data);
  }});
  window.dispatchEvent(new Event('disnote-host-attached'));
  return true;
})();
''';
}
