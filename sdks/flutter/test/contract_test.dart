import 'dart:convert';
import 'dart:io';

import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final Directory fixtures = Directory('test/fixtures/contracts/v1');

  test(
    'valid cross-runtime fixture validates and has the canonical checksum',
    () {
      final Map<String, Object?> manifest = _read(
        '${fixtures.path}/manifest.json',
      );
      final Map<String, Object?> source = _read(
        '${fixtures.path}/valid-document.json',
      );
      final DisNoteDocument document = DisNoteDocument.fromJson(source);
      expect(DisNoteValidator.validate(document).isValid, isTrue);
      expect(disNoteChecksum(document), manifest['canonicalSha256']);
      expect(
        DisNoteDocument.fromJson(document.toJson()).toJson(),
        document.toJson(),
      );
    },
  );

  test('invalid cross-runtime fixture is rejected', () {
    final Map<String, Object?> source = _read(
      '${fixtures.path}/invalid-document.json',
    );
    final DisNoteDocument document = DisNoteDocument.fromJson(source);
    final DisNoteValidationResult result = DisNoteValidator.validate(document);
    expect(result.isValid, isFalse);
    expect(
      result.issues.map((DisNoteValidationIssue issue) => issue.code),
      contains('duplicate-id'),
    );
    expect(
      result.issues.map((DisNoteValidationIssue issue) => issue.code),
      contains('unsafe-url'),
    );
  });

  test('bridge parses documents and rejects oversized or foreign messages', () {
    final Map<String, Object?> source = _read(
      '${fixtures.path}/valid-document.json',
    );
    final String message = jsonEncode(<String, Object?>{
      'version': DisNoteContract.bridgeVersion,
      'kind': DisNoteBridgeKind.document,
      'document': source,
    });
    expect(DisNoteEditorMessage.parse(message), isA<DisNoteEditorDocument>());
    expect(
      () => DisNoteEditorMessage.parse(
        jsonEncode(<String, Object?>{'version': 2, 'kind': 'ready'}),
      ),
      throwsA(isA<DisNoteBridgeException>()),
    );
  });

  test('validator rejects unsafe core props and non-finite JSON numbers', () {
    final DisNoteDocument document = DisNoteDocument(
      id: 'invalid-props',
      blocks: const <DisNoteBlock>[
        DisNoteBlock(
          id: 'heading',
          type: DisNoteBlockType.heading,
          version: 1,
          props: <String, Object?>{'level': 9},
        ),
        DisNoteBlock(
          id: 'media',
          type: DisNoteBlockType.video,
          version: 1,
          props: <String, Object?>{'url': 'javascript:alert(1)'},
        ),
        DisNoteBlock(
          id: 'custom',
          type: 'consumer.card',
          version: 1,
          props: <String, Object?>{'bad': double.infinity},
        ),
      ],
      metadata: const DisNoteMetadata(
        createdAt: '2026-11-19T00:00:00.000Z',
        updatedAt: '2026-11-19T00:00:00.000Z',
      ),
    );
    final DisNoteValidationResult result = DisNoteValidator.validate(document);
    expect(result.isValid, isFalse);
    expect(
      result.issues.map((DisNoteValidationIssue issue) => issue.code),
      containsAll(<String>['invalid', 'unsafe-url', 'not-json']),
    );
  });
}

Map<String, Object?> _read(String path) =>
    (jsonDecode(File(path).readAsStringSync()) as Map<Object?, Object?>)
        .cast<String, Object?>();
