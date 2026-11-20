import 'dart:convert';

import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'Nest client sends a CAS save with idempotency and parses its envelope',
    () async {
      final DisNoteDocument document = _document();
      final _Transport transport = _Transport();
      final DisNoteNestClient client = DisNoteNestClient(
        baseUri: Uri.parse('https://api.disnote.app/'),
        transport: transport,
        headersProvider: () async => <String, String>{
          'authorization': 'Bearer test',
        },
      );

      final DisNoteSaveResult result = await client.savePage(
        channelId: 'channel-1',
        pageId: document.id,
        document: document,
        revision: 3,
        idempotencyKey: 'save-1',
      );

      expect(result.revision, 4);
      expect(
        transport.last!.uri.path,
        '/api/v1/document-channels/channel-1/pages/doc-1',
      );
      expect(transport.last!.headers['authorization'], 'Bearer test');
      final Map<String, Object?> body = (jsonDecode(
        transport.last!.body!,
      ) as Map<Object?, Object?>).cast<String, Object?>();
      expect(body['revision'], 3);
      expect(body['idempotencyKey'], 'save-1');
    },
  );

  test(
    'Nest client exposes conflicts without losing the server code',
    () async {
      final DisNoteNestClient client = DisNoteNestClient(
        baseUri: Uri.parse('https://api.disnote.app'),
        transport: _ConflictTransport(),
      );
      await expectLater(
        client.openPage(channelId: 'channel', pageId: 'page'),
        throwsA(
          isA<DisNoteApiException>().having(
            (DisNoteApiException error) => error.isConflict,
            'isConflict',
            isTrue,
          ),
        ),
      );
    },
  );
}

final class _Transport implements DisNoteHttpTransport {
  DisNoteHttpRequest? last;
  @override
  Future<DisNoteHttpResponse> send(DisNoteHttpRequest request) async {
    last = request;
    return DisNoteHttpResponse(
      200,
      jsonEncode(<String, Object?>{
        'data': <String, Object?>{'ok': true, 'revision': 4},
      }),
    );
  }
}

final class _ConflictTransport implements DisNoteHttpTransport {
  @override
  Future<DisNoteHttpResponse> send(DisNoteHttpRequest request) async =>
      const DisNoteHttpResponse(
        409,
        '{"code":"document-revision-conflict","message":"conflict"}',
      );
}

DisNoteDocument _document() => DisNoteDocument(
  id: 'doc-1',
  blocks: const <DisNoteBlock>[
    DisNoteBlock(
      id: 'paragraph-1',
      type: 'paragraph',
      version: 1,
      content: <DisNoteInline>[DisNoteText('Hello Flutter')],
    ),
  ],
  metadata: const DisNoteMetadata(
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  ),
);
