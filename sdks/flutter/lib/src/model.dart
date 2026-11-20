import 'constants.dart';
import 'errors.dart';

typedef JsonMap = Map<String, Object?>;

final class DisNoteDocument {
  const DisNoteDocument({
    required this.id,
    required this.blocks,
    required this.metadata,
    this.format = DisNoteContract.documentFormat,
    this.schemaVersion = DisNoteContract.schemaVersion,
  });

  final String format;
  final int schemaVersion;
  final String id;
  final List<DisNoteBlock> blocks;
  final DisNoteMetadata metadata;

  factory DisNoteDocument.fromJson(JsonMap json) => DisNoteDocument(
    format: _string(json, 'format'),
    schemaVersion: _integer(json, 'schemaVersion'),
    id: _string(json, 'id'),
    blocks: _list(json, 'blocks')
        .map((Object? value) => DisNoteBlock.fromJson(_map(value, 'blocks')))
        .toList(growable: false),
    metadata: DisNoteMetadata.fromJson(_map(json['metadata'], 'metadata')),
  );

  JsonMap toJson() => <String, Object?>{
    'format': format,
    'schemaVersion': schemaVersion,
    'id': id,
    'blocks': blocks.map((DisNoteBlock block) => block.toJson()).toList(),
    'metadata': metadata.toJson(),
  };

  DisNoteDocument copyWith({
    List<DisNoteBlock>? blocks,
    DisNoteMetadata? metadata,
  }) => DisNoteDocument(
    format: format,
    schemaVersion: schemaVersion,
    id: id,
    blocks: blocks ?? this.blocks,
    metadata: metadata ?? this.metadata,
  );
}

final class DisNoteMetadata {
  const DisNoteMetadata({
    required this.createdAt,
    required this.updatedAt,
    this.title,
    this.description,
    this.locale,
    this.createdBy,
    this.tags = const <String>[],
    this.attributes = const <String, Object?>{},
  });

  final String? title;
  final String? description;
  final String? locale;
  final String createdAt;
  final String updatedAt;
  final String? createdBy;
  final List<String> tags;
  final JsonMap attributes;

  factory DisNoteMetadata.fromJson(JsonMap json) => DisNoteMetadata(
    title: _optionalString(json, 'title'),
    description: _optionalString(json, 'description'),
    locale: _optionalString(json, 'locale'),
    createdAt: _string(json, 'createdAt'),
    updatedAt: _string(json, 'updatedAt'),
    createdBy: _optionalString(json, 'createdBy'),
    tags: json['tags'] == null
        ? const <String>[]
        : _list(json, 'tags')
              .map((Object? value) {
                if (value is! String) {
                  throw const DisNoteFormatException('tag must be a string');
                }
                return value;
              })
              .toList(growable: false),
    attributes: json['attributes'] == null
        ? const <String, Object?>{}
        : Map<String, Object?>.unmodifiable(
            _map(json['attributes'], 'attributes'),
          ),
  );

  JsonMap toJson() => <String, Object?>{
    if (title != null) 'title': title,
    if (description != null) 'description': description,
    if (locale != null) 'locale': locale,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    if (createdBy != null) 'createdBy': createdBy,
    if (tags.isNotEmpty) 'tags': tags,
    if (attributes.isNotEmpty) 'attributes': attributes,
  };
}

final class DisNoteBlock {
  const DisNoteBlock({
    required this.id,
    required this.type,
    required this.version,
    this.props = const <String, Object?>{},
    this.content = const <DisNoteInline>[],
    this.children = const <DisNoteBlock>[],
  });

  final String id;
  final String type;
  final int version;
  final JsonMap props;
  final List<DisNoteInline> content;
  final List<DisNoteBlock> children;

  factory DisNoteBlock.fromJson(JsonMap json) => DisNoteBlock(
    id: _string(json, 'id'),
    type: _string(json, 'type'),
    version: _integer(json, 'version'),
    props: Map<String, Object?>.unmodifiable(_map(json['props'], 'props')),
    content: json['content'] == null
        ? const <DisNoteInline>[]
        : _list(json, 'content')
              .map(
                (Object? value) =>
                    DisNoteInline.fromJson(_map(value, 'content')),
              )
              .toList(growable: false),
    children: json['children'] == null
        ? const <DisNoteBlock>[]
        : _list(json, 'children')
              .map(
                (Object? value) =>
                    DisNoteBlock.fromJson(_map(value, 'children')),
              )
              .toList(growable: false),
  );

  JsonMap toJson() => <String, Object?>{
    'id': id,
    'type': type,
    'version': version,
    'props': props,
    if (content.isNotEmpty)
      'content': content
          .map((DisNoteInline inline) => inline.toJson())
          .toList(),
    if (children.isNotEmpty)
      'children': children.map((DisNoteBlock block) => block.toJson()).toList(),
  };
}

sealed class DisNoteInline {
  const DisNoteInline();
  String get type;
  JsonMap toJson();

  factory DisNoteInline.fromJson(JsonMap json) {
    final String type = _string(json, 'type');
    return switch (type) {
      DisNoteInlineType.text => DisNoteText.fromJson(json),
      DisNoteInlineType.link => DisNoteLink.fromJson(json),
      DisNoteInlineType.mention => DisNoteMention.fromJson(json),
      DisNoteInlineType.reference => DisNoteReference.fromJson(json),
      _ => throw DisNoteFormatException('unsupported inline type "$type"'),
    };
  }
}

final class DisNoteText extends DisNoteInline {
  const DisNoteText(this.text, {this.marks = const <DisNoteMark>[]});
  final String text;
  final List<DisNoteMark> marks;
  @override
  String get type => DisNoteInlineType.text;
  factory DisNoteText.fromJson(JsonMap json) => DisNoteText(
    _string(json, 'text'),
    marks: json['marks'] == null
        ? const <DisNoteMark>[]
        : _list(json, 'marks')
              .map(
                (Object? value) => DisNoteMark.fromJson(_map(value, 'marks')),
              )
              .toList(growable: false),
  );
  @override
  JsonMap toJson() => <String, Object?>{
    'type': type,
    'text': text,
    if (marks.isNotEmpty)
      'marks': marks.map((DisNoteMark mark) => mark.toJson()).toList(),
  };
}

final class DisNoteMark {
  const DisNoteMark(this.type, {this.value});
  final String type;
  final String? value;
  factory DisNoteMark.fromJson(JsonMap json) =>
      DisNoteMark(_string(json, 'type'), value: _optionalString(json, 'value'));
  JsonMap toJson() => <String, Object?>{
    'type': type,
    if (value != null) 'value': value,
  };
}

final class DisNoteLink extends DisNoteInline {
  const DisNoteLink(this.href, this.content);
  final String href;
  final List<DisNoteText> content;
  @override
  String get type => DisNoteInlineType.link;
  factory DisNoteLink.fromJson(JsonMap json) => DisNoteLink(
    _string(json, 'href'),
    _list(json, 'content')
        .map((Object? value) => DisNoteText.fromJson(_map(value, 'content')))
        .toList(growable: false),
  );
  @override
  JsonMap toJson() => <String, Object?>{
    'type': type,
    'href': href,
    'content': content.map((DisNoteText text) => text.toJson()).toList(),
  };
}

final class DisNoteMention extends DisNoteInline {
  const DisNoteMention(this.entityType, this.entityId, this.label);
  final String entityType;
  final String entityId;
  final String label;
  @override
  String get type => DisNoteInlineType.mention;
  factory DisNoteMention.fromJson(JsonMap json) => DisNoteMention(
    _string(json, 'entityType'),
    _string(json, 'entityId'),
    _string(json, 'label'),
  );
  @override
  JsonMap toJson() => <String, Object?>{
    'type': type,
    'entityType': entityType,
    'entityId': entityId,
    'label': label,
  };
}

final class DisNoteReference extends DisNoteInline {
  const DisNoteReference(this.targetType, this.targetId, this.label);
  final String targetType;
  final String targetId;
  final String label;
  @override
  String get type => DisNoteInlineType.reference;
  factory DisNoteReference.fromJson(JsonMap json) => DisNoteReference(
    _string(json, 'targetType'),
    _string(json, 'targetId'),
    _string(json, 'label'),
  );
  @override
  JsonMap toJson() => <String, Object?>{
    'type': type,
    'targetType': targetType,
    'targetId': targetId,
    'label': label,
  };
}

JsonMap _map(Object? value, String path) {
  if (value is! Map<Object?, Object?>) {
    throw DisNoteFormatException('must be an object', path: path);
  }
  return value.map<String, Object?>((Object? key, Object? item) {
    if (key is! String) {
      throw DisNoteFormatException('key must be a string', path: path);
    }
    return MapEntry<String, Object?>(key, item);
  });
}

List<Object?> _list(JsonMap json, String key) {
  final Object? value = json[key];
  if (value is! List<Object?>) {
    throw DisNoteFormatException('must be an array', path: key);
  }
  return value;
}

String _string(JsonMap json, String key) {
  final Object? value = json[key];
  if (value is! String) {
    throw DisNoteFormatException('must be a string', path: key);
  }
  return value;
}

String? _optionalString(JsonMap json, String key) {
  final Object? value = json[key];
  if (value == null) return null;
  if (value is! String) {
    throw DisNoteFormatException('must be a string', path: key);
  }
  return value;
}

int _integer(JsonMap json, String key) {
  final Object? value = json[key];
  if (value is! int) {
    throw DisNoteFormatException('must be an integer', path: key);
  }
  return value;
}
