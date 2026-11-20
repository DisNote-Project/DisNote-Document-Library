import 'package:disnote_flutter/disnote_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('public Flutter API compiles for web', () {
    expect(DisNoteContract.bridgeVersion, 1);
    expect(DisNoteMessages.vi.editorTitle, isNotEmpty);
    expect(DisNoteBlockType.core, contains(DisNoteBlockType.paragraph));
  });
}
