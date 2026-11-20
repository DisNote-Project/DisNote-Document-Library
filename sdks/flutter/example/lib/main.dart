import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:material_ui/material_ui.dart';

void main() => runApp(const DisNoteExampleApp());

final class DisNoteExampleApp extends StatelessWidget {
  const DisNoteExampleApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: _ExampleStrings.title,
    theme: ThemeData(
      colorSchemeSeed: Colors.teal,
      brightness: Brightness.light,
    ),
    darkTheme: ThemeData(
      colorSchemeSeed: Colors.teal,
      brightness: Brightness.dark,
    ),
    home: Scaffold(
      appBar: AppBar(title: const Text(_ExampleStrings.title)),
      body: const DisNoteDocumentView(document: _document),
    ),
  );
}

abstract final class _ExampleStrings {
  static const String title = 'DisNote Flutter';
}

const DisNoteDocument _document = DisNoteDocument(
  id: 'flutter-example',
  blocks: <DisNoteBlock>[
    DisNoteBlock(
      id: 'heading',
      type: DisNoteBlockType.heading,
      version: 1,
      props: <String, Object?>{'level': 1},
      content: <DisNoteInline>[DisNoteText('Một tài liệu, mọi nền tảng')],
    ),
    DisNoteBlock(
      id: 'paragraph',
      type: DisNoteBlockType.paragraph,
      version: 1,
      content: <DisNoteInline>[
        DisNoteText(
          'Nội dung này dùng cùng DisNoteDocument với React, NestJS và Go.',
        ),
      ],
    ),
    DisNoteBlock(
      id: 'check',
      type: DisNoteBlockType.checklistItem,
      version: 1,
      props: <String, Object?>{'checked': true},
      content: <DisNoteInline>[
        DisNoteText('Responsive trên Web, Android và iOS'),
      ],
    ),
  ],
  metadata: DisNoteMetadata(
    title: 'DisNote Flutter',
    locale: DisNoteLocales.vietnamese,
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  ),
);
