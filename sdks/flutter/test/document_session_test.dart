import 'dart:convert';

import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'document session loads, debounces and advances the CAS revision',
    () async {
      final _SessionTransport transport = _SessionTransport();
      final DisNoteDocumentSession session = DisNoteDocumentSession(
        client: DisNoteNestClient(
          baseUri: Uri.parse('https://api.disnote.app'),
          transport: transport,
        ),
        channelId: 'channel',
        pageId: 'doc-1',
        idempotencyKeyFactory: () => 'save-${transport.requests.length}',
        saveDelay: const Duration(days: 1),
      );
      await session.load();
      expect(session.revision, 1);
      final DisNoteDocument edited = session.document!.copyWith(
        blocks: const <DisNoteBlock>[
          DisNoteBlock(
            id: 'p-1',
            type: DisNoteBlockType.paragraph,
            version: 1,
            content: <DisNoteInline>[DisNoteText('Edited')],
          ),
        ],
      );
      session.acceptEditorChange(edited);
      expect(session.hasUnsavedChanges, isTrue);
      await session.flush();
      expect(session.status, DisNoteSessionStatus.ready);
      expect(session.revision, 2);
      expect(session.hasUnsavedChanges, isFalse);
      session.dispose();
    },
  );

  test(
    'document session preserves local content on a revision conflict',
    () async {
      final _SessionTransport transport = _SessionTransport(conflict: true);
      final DisNoteDocumentSession session = DisNoteDocumentSession(
        client: DisNoteNestClient(
          baseUri: Uri.parse('https://api.disnote.app'),
          transport: transport,
        ),
        channelId: 'channel',
        pageId: 'doc-1',
        idempotencyKeyFactory: () => 'conflict-key',
        saveDelay: const Duration(days: 1),
      );
      await session.load();
      final DisNoteDocument edited = session.document!.copyWith(
        blocks: const <DisNoteBlock>[
          DisNoteBlock(
            id: 'p-1',
            type: DisNoteBlockType.paragraph,
            version: 1,
            content: <DisNoteInline>[DisNoteText('Keep me')],
          ),
        ],
      );
      session.acceptEditorChange(edited);
      await session.flush();
      expect(session.status, DisNoteSessionStatus.conflict);
      expect(session.conflictingRevision, 4);
      expect(
        session.document!.blocks.single.content.single,
        isA<DisNoteText>(),
      );
      expect(session.hasUnsavedChanges, isTrue);
      session.dispose();
    },
  );
}

final class _SessionTransport implements DisNoteHttpTransport {
  _SessionTransport({this.conflict = false});
  final bool conflict;
  final List<DisNoteHttpRequest> requests = <DisNoteHttpRequest>[];

  @override
  Future<DisNoteHttpResponse> send(DisNoteHttpRequest request) async {
    requests.add(request);
    if (request.method == DisNoteHttpMethod.get) {
      return DisNoteHttpResponse(
        200,
        jsonEncode(<String, Object?>{
          'data': <String, Object?>{
            'page': <String, Object?>{
              'id': 'doc-1',
              'revision': 1,
              'document': _document().toJson(),
            },
          },
        }),
      );
    }
    return DisNoteHttpResponse(
      200,
      jsonEncode(<String, Object?>{
        'data': conflict
            ? <String, Object?>{
                'ok': false,
                'reason': 'revision-conflict',
                'currentRevision': 4,
              }
            : <String, Object?>{'ok': true, 'revision': 2},
      }),
    );
  }
}

DisNoteDocument _document() => const DisNoteDocument(
  id: 'doc-1',
  blocks: <DisNoteBlock>[
    DisNoteBlock(
      id: 'p-1',
      type: DisNoteBlockType.paragraph,
      version: 1,
      content: <DisNoteInline>[DisNoteText('Initial')],
    ),
  ],
  metadata: DisNoteMetadata(
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  ),
);
