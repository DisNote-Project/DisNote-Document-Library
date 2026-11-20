import 'constants.dart';
import 'model.dart';

final class DisNoteValidationIssue {
  const DisNoteValidationIssue(this.path, this.code, this.message);
  final String path;
  final String code;
  final String message;
}

final class DisNoteValidationResult {
  const DisNoteValidationResult(this.issues);
  final List<DisNoteValidationIssue> issues;
  bool get isValid => issues.isEmpty;
}

abstract final class DisNoteValidator {
  static const Set<String> _markTypes = <String>{
    'bold',
    'italic',
    'underline',
    'strike',
    'code',
    'textColor',
    'backgroundColor',
  };
  static const Set<String> _mentionTypes = <String>{'user', 'channel'};
  static const Set<String> _referenceTypes = <String>{
    'task',
    'document',
    'message',
    'file',
  };
  static final RegExp _isoDate = RegExp(
    r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$',
  );
  static final RegExp _color = RegExp(r'^[#a-zA-Z0-9(),.%\s-]+$');
  static final RegExp _scheme = RegExp(
    r'^([a-z][a-z0-9+.-]*):',
    caseSensitive: false,
  );

  static DisNoteValidationResult validate(
    DisNoteDocument document, {
    int maxDepth = 100,
    int maxBlocks = 10000,
    int maxTextLength = 1000000,
  }) {
    final List<DisNoteValidationIssue> issues = <DisNoteValidationIssue>[];
    void add(String path, String code, String message) =>
        issues.add(DisNoteValidationIssue(path, code, message));

    if (document.format != DisNoteContract.documentFormat) {
      add('format', 'invalid', 'unsupported document format');
    }
    if (document.schemaVersion < 0) {
      add('schemaVersion', 'invalid', 'schema version must be non-negative');
    } else if (document.schemaVersion > DisNoteContract.schemaVersion) {
      add(
        'schemaVersion',
        'unsupported-future-version',
        'document schema is newer than this SDK',
      );
    }
    if (document.id.isEmpty || document.id.length > 256) {
      add('id', 'invalid', 'document id must contain 1 to 256 characters');
    }
    if (!_validDate(document.metadata.createdAt)) {
      add(
        'metadata.createdAt',
        'invalid',
        'createdAt must be an ISO-8601 instant',
      );
    }
    if (!_validDate(document.metadata.updatedAt)) {
      add(
        'metadata.updatedAt',
        'invalid',
        'updatedAt must be an ISO-8601 instant',
      );
    }
    final String? locale = document.metadata.locale;
    if (locale != null && !DisNoteLocales.supported.contains(locale)) {
      add('metadata.locale', 'invalid', 'locale must be en or vi');
    }
    if (!_isJson(document.metadata.attributes)) {
      add(
        'metadata.attributes',
        'not-json',
        'attributes must contain JSON values only',
      );
    }
    if ((document.metadata.title?.length ?? 0) > 1000) {
      add('metadata.title', 'too-long', 'title is too long');
    }
    if ((document.metadata.description?.length ?? 0) > 10000) {
      add('metadata.description', 'too-long', 'description is too long');
    }
    if (document.metadata.tags.length > 100 ||
        document.metadata.tags.any((String tag) => tag.length > 256)) {
      add('metadata.tags', 'too-large', 'tags exceed the supported limit');
    }

    final Set<String> ids = <String>{};
    int blockCount = 0;
    void blocks(List<DisNoteBlock> values, String path, int depth) {
      if (depth > maxDepth) {
        add(path, 'max-depth', 'block nesting exceeds $maxDepth');
        return;
      }
      for (int index = 0; index < values.length; index += 1) {
        final DisNoteBlock block = values[index];
        final String current = '$path[$index]';
        blockCount += 1;
        if (blockCount > maxBlocks) {
          add(current, 'max-blocks', 'document exceeds $maxBlocks blocks');
          return;
        }
        if (block.id.isEmpty) {
          add('$current.id', 'invalid', 'block id is required');
        } else if (!ids.add(block.id)) {
          add('$current.id', 'duplicate-id', 'block ids must be unique');
        }
        if (block.type.isEmpty ||
            block.type.length > 128 ||
            !RegExp(r'^[A-Za-z][A-Za-z0-9._-]*$').hasMatch(block.type)) {
          add('$current.type', 'invalid', 'block type is invalid');
        }
        if (block.version < 1) {
          add('$current.version', 'invalid', 'block version must be positive');
        }
        if (!_isJson(block.props)) {
          add(
            '$current.props',
            'not-json',
            'props must contain JSON values only',
          );
        }
        _validateBlockProps(block, current, add);
        _validateInline(block.content, '$current.content', add, maxTextLength);
        blocks(block.children, '$current.children', depth + 1);
      }
    }

    blocks(document.blocks, 'blocks', 0);
    return DisNoteValidationResult(
      List<DisNoteValidationIssue>.unmodifiable(issues),
    );
  }

  static void _validateInline(
    List<DisNoteInline> content,
    String path,
    void Function(String, String, String) add,
    int maxTextLength,
  ) {
    for (int index = 0; index < content.length; index += 1) {
      final DisNoteInline inline = content[index];
      final String current = '$path[$index]';
      switch (inline) {
        case DisNoteText(:final text, :final marks):
          if (text.length > maxTextLength) {
            add('$current.text', 'too-long', 'inline text is too long');
          }
          for (int markIndex = 0; markIndex < marks.length; markIndex += 1) {
            final DisNoteMark mark = marks[markIndex];
            final String markPath = '$current.marks[$markIndex]';
            if (!_markTypes.contains(mark.type)) {
              add(markPath, 'unknown-mark', 'unsupported text mark');
            } else if (mark.type == 'textColor' ||
                mark.type == 'backgroundColor') {
              final String? value = mark.value;
              if (value == null || !_validColor(value)) {
                add('$markPath.value', 'unsafe-color', 'invalid color value');
              }
            }
          }
          break;
        case DisNoteLink(:final href, :final content):
          if (!_safeUrl(href)) {
            add('$current.href', 'unsafe-url', 'unsafe link URL');
          }
          for (int child = 0; child < content.length; child += 1) {
            _validateInline(
              <DisNoteInline>[content[child]],
              '$current.content[$child]',
              add,
              maxTextLength,
            );
          }
          break;
        case DisNoteMention(:final entityType, :final entityId):
          if (!_mentionTypes.contains(entityType)) {
            add('$current.entityType', 'invalid', 'unsupported mention entity');
          }
          if (entityId.isEmpty) {
            add('$current.entityId', 'invalid', 'entity id is required');
          }
          break;
        case DisNoteReference(:final targetType, :final targetId):
          if (!_referenceTypes.contains(targetType)) {
            add(
              '$current.targetType',
              'invalid',
              'unsupported reference target',
            );
          }
          if (targetId.isEmpty) {
            add('$current.targetId', 'invalid', 'target id is required');
          }
          break;
      }
    }
  }

  static void _validateBlockProps(
    DisNoteBlock block,
    String path,
    void Function(String, String, String) add,
  ) {
    switch (block.type) {
      case DisNoteBlockType.heading:
        if (!<int>{1, 2, 3}.contains(block.props['level'])) {
          add(
            '$path.props.level',
            'invalid',
            'heading level must be 1, 2 or 3',
          );
        }
        break;
      case DisNoteBlockType.checklistItem:
        if (block.props['checked'] != null && block.props['checked'] is! bool) {
          add('$path.props.checked', 'invalid', 'checked must be a boolean');
        }
        break;
      case DisNoteBlockType.codeBlock:
        if (block.props['code'] is! String ||
            block.props['language'] is! String) {
          add(
            '$path.props',
            'invalid',
            'code block requires code and language strings',
          );
        }
        break;
      case DisNoteBlockType.image:
        final Object? assetId = block.props['assetId'];
        final Object? url = block.props['url'];
        if ((assetId is! String || assetId.isEmpty) &&
            (url is! String || !_safeUrl(url))) {
          add(
            '$path.props',
            'required',
            'image requires an assetId or safe URL',
          );
        }
        break;
      case DisNoteBlockType.table:
        if (block.props['rows'] is! List<Object?>) {
          add('$path.props.rows', 'invalid', 'table rows must be an array');
        }
        break;
      case DisNoteBlockType.math:
        final Object? code = block.props['code'];
        if (code is! String || code.length > 20000) {
          add(
            '$path.props.code',
            'invalid',
            'math code must be a string no longer than 20000 characters',
          );
        }
        break;
      case DisNoteBlockType.bookmark:
      case DisNoteBlockType.video:
      case DisNoteBlockType.audio:
      case DisNoteBlockType.file:
        final Object? url = block.props['url'];
        if (url != null &&
            (url is! String || (url.isNotEmpty && !_safeUrl(url)))) {
          add('$path.props.url', 'unsafe-url', 'media URL is unsafe');
        }
        break;
      case DisNoteBlockType.column:
        final Object? width = block.props['width'];
        if (width != null &&
            (width is! num || !width.isFinite || width <= 0 || width > 1)) {
          add(
            '$path.props.width',
            'invalid',
            'column width must be greater than 0 and at most 1',
          );
        }
        break;
      case DisNoteBlockType.diagram:
        final Object? format = block.props['format'];
        final Object? code = block.props['code'];
        if (!<String>{'mermaid', 'drawio'}.contains(format) ||
            code is! String ||
            code.length > 200000) {
          add(
            '$path.props',
            'invalid',
            'diagram requires a supported format and bounded code',
          );
        }
        break;
    }
  }

  static bool _validDate(String value) =>
      _isoDate.hasMatch(value) && DateTime.tryParse(value) != null;

  static bool _validColor(String value) {
    final String normalized = value.trim();
    return normalized.isNotEmpty &&
        normalized.length <= 64 &&
        _color.hasMatch(normalized);
  }

  static bool _safeUrl(String value) {
    final String normalized = value.trim();
    if (normalized.isEmpty ||
        normalized.runes.any((int rune) => rune <= 31 || rune == 127)) {
      return false;
    }
    if (RegExp(r'\s').hasMatch(normalized)) return false;
    final RegExpMatch? match = _scheme.firstMatch(normalized);
    if (match == null) return true;
    return <String>{
      'https',
      'http',
      'mailto',
      'tel',
    }.contains(match.group(1)!.toLowerCase());
  }

  static bool _isJson(Object? value) {
    if (value == null || value is String || value is bool) return true;
    if (value is num) return value.isFinite;
    if (value is List<Object?>) return value.every(_isJson);
    if (value is Map<String, Object?>) return value.values.every(_isJson);
    return false;
  }
}
