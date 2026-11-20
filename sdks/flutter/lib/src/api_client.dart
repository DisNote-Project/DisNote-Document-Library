import 'dart:convert';

import 'constants.dart';
import 'errors.dart';
import 'model.dart';
import 'validation.dart';

enum DisNoteHttpMethod { get, post, put }

enum DisNoteCommentAction { create, reply, resolve, reopen }

final class DisNoteHttpRequest {
  const DisNoteHttpRequest({
    required this.method,
    required this.uri,
    this.headers = const <String, String>{},
    this.body,
  });
  final DisNoteHttpMethod method;
  final Uri uri;
  final Map<String, String> headers;
  final String? body;
}

final class DisNoteHttpResponse {
  const DisNoteHttpResponse(
    this.statusCode,
    this.body, {
    this.headers = const <String, String>{},
  });
  final int statusCode;
  final String body;
  final Map<String, String> headers;
}

abstract interface class DisNoteHttpTransport {
  Future<DisNoteHttpResponse> send(DisNoteHttpRequest request);
}

typedef DisNoteHeadersProvider = Future<Map<String, String>> Function();

final class DisNotePageSnapshot {
  const DisNotePageSnapshot({
    required this.document,
    required this.revision,
    required this.raw,
  });
  final DisNoteDocument document;
  final int revision;
  final JsonMap raw;

  factory DisNotePageSnapshot.fromJson(JsonMap value) {
    final Object? pageValue = value['page'];
    final JsonMap page = pageValue is Map<String, Object?> ? pageValue : value;
    final Object? rawDocument = page['document'];
    final Object? rawRevision = page['revision'];
    if (rawDocument is! Map<String, Object?> || rawRevision is! int) {
      throw const DisNoteFormatException(
        'page response is missing document or revision',
      );
    }
    final DisNoteDocument document = DisNoteDocument.fromJson(rawDocument);
    final DisNoteValidationResult validation = DisNoteValidator.validate(
      document,
    );
    if (!validation.isValid) {
      throw const DisNoteFormatException('server returned an invalid document');
    }
    return DisNotePageSnapshot(
      document: document,
      revision: rawRevision,
      raw: value,
    );
  }
}

final class DisNotePageList {
  const DisNotePageList({
    required this.revision,
    required this.canEdit,
    required this.pages,
  });
  final int revision;
  final bool canEdit;
  final List<JsonMap> pages;

  factory DisNotePageList.fromJson(JsonMap value) {
    final Object? rawRevision = value['revision'];
    final Object? rawCanEdit = value['canEdit'];
    final Object? rawPages = value['pages'];
    if (rawRevision is! int ||
        rawCanEdit is! bool ||
        rawPages is! List<Object?>) {
      throw const DisNoteFormatException('page list response is malformed');
    }
    return DisNotePageList(
      revision: rawRevision,
      canEdit: rawCanEdit,
      pages: rawPages
          .map<JsonMap>((Object? row) => _jsonMap(row, 'page list item'))
          .toList(growable: false),
    );
  }
}

final class DisNoteSaveResult {
  const DisNoteSaveResult({
    required this.ok,
    this.revision,
    this.reason,
    this.currentRevision,
  });
  final bool ok;
  final int? revision;
  final String? reason;
  final int? currentRevision;

  bool get isRevisionConflict => !ok && reason == 'revision-conflict';

  factory DisNoteSaveResult.fromJson(JsonMap value) {
    if (value['ok'] is! bool) {
      throw const DisNoteFormatException('save response is missing ok');
    }
    return DisNoteSaveResult(
      ok: value['ok']! as bool,
      revision: value['revision'] as int?,
      reason: value['reason'] as String?,
      currentRevision: value['currentRevision'] as int?,
    );
  }
}

final class DisNoteNestClient {
  DisNoteNestClient({
    required Uri baseUri,
    required this.transport,
    this.headersProvider,
    this.apiPrefix = DisNoteContract.defaultApiPrefix,
    this.maxResponseBytes = 8 * 1024 * 1024,
  }) : baseUri = _normalizeBaseUri(baseUri);

  final Uri baseUri;
  final DisNoteHttpTransport transport;
  final DisNoteHeadersProvider? headersProvider;
  final String apiPrefix;
  final int maxResponseBytes;

  Future<DisNotePageSnapshot> openPage({
    required String channelId,
    required String pageId,
  }) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      _pagePath(channelId, pageId),
    );
    return DisNotePageSnapshot.fromJson(_jsonMap(data, 'page response'));
  }

  Future<DisNoteSaveResult> savePage({
    required String channelId,
    required String pageId,
    required DisNoteDocument document,
    required int revision,
    required String idempotencyKey,
    int? collaborationRevision,
    String? collaborationGeneration,
  }) async {
    _requireIdentifier(channelId, 'channelId');
    _requireIdentifier(pageId, 'pageId');
    _requireRevision(revision, 'revision');
    _requireIdempotencyKey(idempotencyKey);
    if (!DisNoteValidator.validate(document).isValid) {
      throw const DisNoteFormatException(
        'refusing to send an invalid document',
      );
    }
    final Object? data = await _request(
      DisNoteHttpMethod.put,
      _pagePath(channelId, pageId),
      body: <String, Object?>{
        'document': document.toJson(),
        'revision': revision,
        'idempotencyKey': idempotencyKey,
        'collaborationRevision': ?collaborationRevision,
        'collaborationGeneration': ?collaborationGeneration,
      },
    );
    return DisNoteSaveResult.fromJson(_jsonMap(data, 'save response'));
  }

  Future<DisNotePageList> listPages({
    required String channelId,
    bool trash = false,
  }) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      _channelPath(channelId, 'pages'),
      query: <String, String>{if (trash) 'trash': 'true'},
    );
    return DisNotePageList.fromJson(_jsonMap(data, 'page list response'));
  }

  Future<List<JsonMap>> history({
    required String channelId,
    required String pageId,
  }) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      '${_pagePath(channelId, pageId)}/history',
    );
    if (data is! List<Object?>) {
      throw const DisNoteFormatException('history response must be an array');
    }
    return data
        .map<JsonMap>((Object? row) => _jsonMap(row, 'history item'))
        .toList(growable: false);
  }

  Future<DisNoteDocument> revision({
    required String channelId,
    required String pageId,
    required int revision,
  }) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      '${_pagePath(channelId, pageId)}/history/$revision',
    );
    final DisNoteDocument document = DisNoteDocument.fromJson(
      _jsonMap(data, 'document revision'),
    );
    if (!DisNoteValidator.validate(document).isValid) {
      throw const DisNoteFormatException(
        'server returned an invalid document revision',
      );
    }
    return document;
  }

  Future<DisNoteSaveResult> restore({
    required String channelId,
    required String pageId,
    required int revision,
    required int expectedRevision,
    required String idempotencyKey,
  }) async {
    _requireRevision(revision, 'revision');
    _requireRevision(expectedRevision, 'expectedRevision');
    _requireIdempotencyKey(idempotencyKey);
    final Object? data = await _request(
      DisNoteHttpMethod.post,
      '${_pagePath(channelId, pageId)}/restore',
      body: <String, Object?>{
        'revision': revision,
        'expectedRevision': expectedRevision,
        'idempotencyKey': idempotencyKey,
      },
    );
    return DisNoteSaveResult.fromJson(_jsonMap(data, 'restore response'));
  }

  Future<JsonMap> collaboration({
    required String channelId,
    required String pageId,
  }) async => _jsonMap(
    await _request(
      DisNoteHttpMethod.get,
      '${_pagePath(channelId, pageId)}/collaboration',
    ),
    'collaboration response',
  );

  Future<JsonMap> executeWorkspaceActions({
    required String channelId,
    required int revision,
    required List<JsonMap> actions,
  }) async => _jsonMap(
    await _request(
      DisNoteHttpMethod.post,
      _channelPath(channelId, 'workspace/actions'),
      body: <String, Object?>{'revision': revision, 'actions': actions},
    ),
    'workspace action response',
  );

  Future<List<JsonMap>> comments({
    required String channelId,
    required String pageId,
  }) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      '${_pagePath(channelId, pageId)}/comments',
    );
    if (data is! List<Object?>) {
      throw const DisNoteFormatException('comments response must be an array');
    }
    return data
        .map<JsonMap>((Object? row) => _jsonMap(row, 'comment'))
        .toList(growable: false);
  }

  Future<JsonMap> comment({
    required String channelId,
    required String pageId,
    required int revision,
    required DisNoteCommentAction action,
    String? body,
    String? threadId,
    int? documentRevision,
    JsonMap? anchor,
  }) async {
    if (revision < 0) {
      throw ArgumentError.value(revision, 'revision', 'must be non-negative');
    }
    if ((body?.length ?? 0) > 10000) {
      throw ArgumentError.value(
        body,
        'body',
        'must not exceed 10000 characters',
      );
    }
    return _jsonMap(
      await _request(
        DisNoteHttpMethod.post,
        '${_pagePath(channelId, pageId)}/comments',
        body: <String, Object?>{
          'revision': revision,
          'action': action.name,
          'body': ?body,
          'threadId': ?threadId,
          'documentRevision': ?documentRevision,
          'anchor': ?anchor,
        },
      ),
      'comment response',
    );
  }

  Future<List<JsonMap>> sharedSources({required String channelId}) async {
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      _channelPath(channelId, 'shared-sources'),
    );
    if (data is! List<Object?>) {
      throw const DisNoteFormatException(
        'shared source response must be an array',
      );
    }
    return data
        .map<JsonMap>((Object? row) => _jsonMap(row, 'shared source'))
        .toList(growable: false);
  }

  Future<JsonMap> sharedSource({
    required String channelId,
    required String sourceId,
  }) async => _jsonMap(
    await _request(
      DisNoteHttpMethod.get,
      _channelPath(
        channelId,
        'shared-sources/${Uri.encodeComponent(sourceId)}',
      ),
    ),
    'shared source response',
  );

  Future<List<JsonMap>> search({
    required String channelId,
    required String query,
  }) async {
    if (query.length > 1000) {
      throw ArgumentError.value(
        query,
        'query',
        'must not exceed 1000 characters',
      );
    }
    final Object? data = await _request(
      DisNoteHttpMethod.get,
      _channelPath(channelId, 'search'),
      query: <String, String>{'q': query},
    );
    if (data is! List<Object?>) {
      throw const DisNoteFormatException('search response must be an array');
    }
    return data
        .map<JsonMap>((Object? row) => _jsonMap(row, 'search result'))
        .toList(growable: false);
  }

  Future<Object?> _request(
    DisNoteHttpMethod method,
    String path, {
    Map<String, Object?>? body,
    Map<String, String>? query,
  }) async {
    final Map<String, String> headers = <String, String>{
      ...?await headersProvider?.call(),
      'accept': 'application/json',
      if (body != null) 'content-type': 'application/json',
    };
    final Uri uri = baseUri
        .resolve(path)
        .replace(queryParameters: query?.isEmpty == true ? null : query);
    final DisNoteHttpResponse response = await transport.send(
      DisNoteHttpRequest(
        method: method,
        uri: uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
      ),
    );
    if (utf8.encode(response.body).length > maxResponseBytes) {
      throw const DisNoteFormatException(
        'server response exceeds the configured size limit',
      );
    }
    final Object? decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } on FormatException {
      throw const DisNoteFormatException('server response is not valid JSON');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final JsonMap error = decoded is Map<String, Object?>
          ? decoded
          : const <String, Object?>{};
      throw DisNoteApiException(
        response.statusCode,
        error['code'] is String
            ? error['code']! as String
            : 'document-request-failed',
        error['message'] is String
            ? error['message']! as String
            : 'Document request failed',
      );
    }
    if (decoded is Map<String, Object?> && decoded.containsKey('data')) {
      return decoded['data'];
    }
    return decoded;
  }

  String _pagePath(String channelId, String pageId) {
    _requireIdentifier(pageId, 'pageId');
    return _channelPath(channelId, 'pages/${Uri.encodeComponent(pageId)}');
  }

  String _channelPath(String channelId, String suffix) {
    _requireIdentifier(channelId, 'channelId');
    final String prefix = apiPrefix.startsWith('/')
        ? apiPrefix.substring(1)
        : apiPrefix;
    return '$prefix/${DisNoteContract.documentChannelsPath}/${Uri.encodeComponent(channelId)}/$suffix';
  }
}

final RegExp _identifierPattern = RegExp(r'^[a-zA-Z0-9_-]{1,160}$');

void _requireIdentifier(String value, String name) {
  if (!_identifierPattern.hasMatch(value)) {
    throw ArgumentError.value(
      value,
      name,
      'must be a valid DisNote identifier',
    );
  }
}

void _requireRevision(int value, String name) {
  if (value < 1) throw ArgumentError.value(value, name, 'must be positive');
}

void _requireIdempotencyKey(String value) {
  if (value.trim().isEmpty || value.length > 200) {
    throw ArgumentError.value(
      value,
      'idempotencyKey',
      'must contain 1 to 200 characters',
    );
  }
}

Uri _normalizeBaseUri(Uri uri) {
  if (!uri.hasScheme || (uri.scheme != 'https' && uri.scheme != 'http')) {
    throw ArgumentError.value(
      uri,
      'baseUri',
      'must be an absolute HTTP(S) URI',
    );
  }
  return uri.replace(path: uri.path.endsWith('/') ? uri.path : '${uri.path}/');
}

JsonMap _jsonMap(Object? value, String name) {
  if (value is! Map<Object?, Object?>) {
    throw DisNoteFormatException('$name must be an object');
  }
  return value.map<String, Object?>((Object? key, Object? item) {
    if (key is! String) {
      throw DisNoteFormatException('$name has a non-string key');
    }
    return MapEntry<String, Object?>(key, item);
  });
}
