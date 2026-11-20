import 'package:flutter/widgets.dart';

import 'model.dart';

final class DisNoteEditorPlatformView extends StatelessWidget {
  const DisNoteEditorPlatformView({
    required this.editorUri,
    required this.document,
    required this.editable,
    required this.locale,
    required this.editorTitle,
    required this.allowedOrigins,
    required this.onDocumentChanged,
    required this.onReady,
    required this.onError,
    this.onNavigationBlocked,
    super.key,
  });

  final Uri editorUri;
  final DisNoteDocument document;
  final bool editable;
  final String locale;
  final String editorTitle;
  final Set<String> allowedOrigins;
  final ValueChanged<DisNoteDocument> onDocumentChanged;
  final VoidCallback onReady;
  final void Function(Object, StackTrace) onError;
  final ValueChanged<Uri>? onNavigationBlocked;

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => onError(
        UnsupportedError(
          'DisNote editor is supported on Flutter Web, Android and iOS.',
        ),
        StackTrace.current,
      ),
    );
    return const SizedBox.expand();
  }
}
