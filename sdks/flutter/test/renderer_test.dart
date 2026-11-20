import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('native renderer displays nested rich content', (
    WidgetTester tester,
  ) async {
    final DisNoteDocument document = DisNoteDocument(
      id: 'doc-render',
      blocks: const <DisNoteBlock>[
        DisNoteBlock(
          id: 'heading',
          type: 'heading',
          version: 1,
          props: <String, Object?>{'level': 1},
          content: <DisNoteInline>[DisNoteText('Flutter document')],
          children: <DisNoteBlock>[
            DisNoteBlock(
              id: 'item',
              type: 'checklistItem',
              version: 1,
              props: <String, Object?>{'checked': true},
              content: <DisNoteInline>[DisNoteText('Shared contract')],
            ),
          ],
        ),
      ],
      metadata: const DisNoteMetadata(
        createdAt: '2026-11-19T00:00:00.000Z',
        updatedAt: '2026-11-19T00:00:00.000Z',
      ),
    );
    await tester.pumpWidget(
      MaterialApp(home: DisNoteDocumentView(document: document)),
    );
    expect(find.text('Flutter document'), findsOneWidget);
    expect(find.text('Shared contract'), findsOneWidget);
    expect(find.byIcon(Icons.check_box), findsOneWidget);
  });

  testWidgets(
    'native renderer localizes fallbacks and stacks columns on phones',
    (WidgetTester tester) async {
      final DisNoteDocument document = DisNoteDocument(
        id: 'doc-responsive',
        blocks: const <DisNoteBlock>[
          DisNoteBlock(
            id: 'columns',
            type: DisNoteBlockType.columnList,
            version: 1,
            children: <DisNoteBlock>[
              DisNoteBlock(
                id: 'column-1',
                type: DisNoteBlockType.column,
                version: 1,
                children: <DisNoteBlock>[
                  DisNoteBlock(
                    id: 'p-1',
                    type: DisNoteBlockType.paragraph,
                    version: 1,
                    content: <DisNoteInline>[DisNoteText('Cột một')],
                  ),
                ],
              ),
              DisNoteBlock(
                id: 'column-2',
                type: DisNoteBlockType.column,
                version: 1,
                children: <DisNoteBlock>[
                  DisNoteBlock(
                    id: 'p-2',
                    type: DisNoteBlockType.paragraph,
                    version: 1,
                    content: <DisNoteInline>[DisNoteText('Cột hai')],
                  ),
                ],
              ),
            ],
          ),
          DisNoteBlock(id: 'custom', type: 'consumer.card', version: 1),
        ],
        metadata: const DisNoteMetadata(
          locale: DisNoteLocales.vietnamese,
          createdAt: '2026-11-19T00:00:00.000Z',
          updatedAt: '2026-11-19T00:00:00.000Z',
        ),
      );
      await tester.binding.setSurfaceSize(const Size(390, 844));
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DisNoteDocumentView(document: document)),
        ),
      );
      expect(find.text('Cột một'), findsOneWidget);
      expect(find.text('Cột hai'), findsOneWidget);
      expect(find.text('Khối chưa được hỗ trợ'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.binding.setSurfaceSize(null);
    },
  );

  testWidgets('native renderer renders code props and safe links', (
    WidgetTester tester,
  ) async {
    Uri? opened;
    final DisNoteDocument document = DisNoteDocument(
      id: 'doc-code-link',
      blocks: const <DisNoteBlock>[
        DisNoteBlock(
          id: 'code',
          type: DisNoteBlockType.codeBlock,
          version: 1,
          props: <String, Object?>{
            'code': 'final answer = 42;',
            'language': 'dart',
          },
        ),
        DisNoteBlock(
          id: 'link',
          type: DisNoteBlockType.paragraph,
          version: 1,
          content: <DisNoteInline>[
            DisNoteLink('https://disnote.app/docs', <DisNoteText>[
              DisNoteText('Docs'),
            ]),
          ],
        ),
      ],
      metadata: const DisNoteMetadata(
        createdAt: '2026-11-19T00:00:00.000Z',
        updatedAt: '2026-11-19T00:00:00.000Z',
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: DisNoteDocumentView(
          document: document,
          onLinkTap: (Uri uri) => opened = uri,
        ),
      ),
    );
    expect(find.text('final answer = 42;'), findsOneWidget);
    await tester.tap(find.text('Docs'));
    expect(opened, Uri.parse('https://disnote.app/docs'));
  });
}
