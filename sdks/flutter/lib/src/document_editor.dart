import 'package:material_ui/material_ui.dart';

import 'constants.dart';
import 'localization.dart';
import 'model.dart';
import 'validation.dart';
import 'editor_platform_stub.dart'
    if (dart.library.io) 'editor_platform_mobile.dart'
    if (dart.library.js_interop) 'editor_platform_web.dart'
    as platform;

typedef DisNoteDocumentChanged = void Function(DisNoteDocument document);
typedef DisNoteEditorError = void Function(Object error, StackTrace stackTrace);
typedef DisNoteEditorOverlayBuilder = Widget Function(
  BuildContext context,
  DisNoteMessages messages,
  VoidCallback retry,
);

enum DisNoteEditorStatus { loading, ready, failed }

final class DisNoteDocumentEditor extends StatefulWidget {
  const DisNoteDocumentEditor({
    required this.editorUri,
    required this.document,
    required this.onDocumentChanged,
    this.editable = true,
    this.locale = DisNoteLocales.english,
    this.onError,
    this.onReady,
    this.onNavigationBlocked,
    this.allowedOrigins,
    this.messages,
    this.loadingBuilder,
    this.errorBuilder,
    this.backgroundColor,
    this.allowInsecureLocalhost = false,
    super.key,
  });

  final Uri editorUri;
  final DisNoteDocument document;
  final bool editable;
  final String locale;
  final DisNoteDocumentChanged onDocumentChanged;
  final DisNoteEditorError? onError;
  final VoidCallback? onReady;
  final ValueChanged<Uri>? onNavigationBlocked;
  final Set<String>? allowedOrigins;
  final DisNoteMessages? messages;
  final DisNoteEditorOverlayBuilder? loadingBuilder;
  final DisNoteEditorOverlayBuilder? errorBuilder;
  final Color? backgroundColor;
  final bool allowInsecureLocalhost;

  @override
  State<DisNoteDocumentEditor> createState() => _DisNoteDocumentEditorState();
}

final class _DisNoteDocumentEditorState extends State<DisNoteDocumentEditor> {
  DisNoteEditorStatus _status = DisNoteEditorStatus.loading;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _validateConfiguration();
  }

  @override
  void didUpdateWidget(covariant DisNoteDocumentEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    _validateConfiguration();
    if (oldWidget.editorUri != widget.editorUri ||
        oldWidget.document.id != widget.document.id) {
      _status = DisNoteEditorStatus.loading;
      _generation += 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final DisNoteMessages messages =
        widget.messages ?? DisNoteMessages.forLocale(widget.locale);
    return ColoredBox(
      color: widget.backgroundColor ?? Theme.of(context).colorScheme.surface,
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Semantics(
            container: true,
            label: messages.editorTitle,
            child: platform.DisNoteEditorPlatformView(
              key: ValueKey<String>(
                '${widget.document.id}:${widget.editorUri}:$_generation',
              ),
              editorUri: widget.editorUri,
              document: widget.document,
              editable: widget.editable,
              locale: widget.locale,
              editorTitle: messages.editorTitle,
              allowedOrigins: _origins,
              onDocumentChanged: widget.onDocumentChanged,
              onNavigationBlocked: widget.onNavigationBlocked,
              onReady: () {
                if (!mounted) return;
                setState(() => _status = DisNoteEditorStatus.ready);
                widget.onReady?.call();
              },
              onError: _handleError,
            ),
          ),
          if (_status == DisNoteEditorStatus.loading)
            widget.loadingBuilder?.call(context, messages, _retry) ??
                _DefaultLoadingOverlay(messages: messages),
          if (_status == DisNoteEditorStatus.failed)
            widget.errorBuilder?.call(context, messages, _retry) ??
                _DefaultErrorOverlay(messages: messages, onRetry: _retry),
        ],
      ),
    );
  }

  Set<String> get _origins => Set<String>.unmodifiable(
    widget.allowedOrigins ?? <String>{widget.editorUri.origin},
  );

  void _validateConfiguration() {
    if (!_isAllowedEditorUri(widget.editorUri)) {
      throw ArgumentError.value(
        widget.editorUri,
        'editorUri',
        'must be an absolute HTTPS URI',
      );
    }
    if (!DisNoteLocales.supported.contains(widget.locale)) {
      throw ArgumentError.value(widget.locale, 'locale', 'must be en or vi');
    }
    if (!DisNoteValidator.validate(widget.document).isValid) {
      throw ArgumentError.value(widget.document, 'document', 'must be valid');
    }
    final Set<String> origins =
        widget.allowedOrigins ?? <String>{widget.editorUri.origin};
    if (origins.isEmpty ||
        origins.any((String origin) {
          final Uri? uri = Uri.tryParse(origin);
          return uri == null ||
              !_isAllowedEditorUri(uri) ||
              uri.origin != origin;
        })) {
      throw ArgumentError.value(
        origins,
        'allowedOrigins',
        'must contain HTTPS origins only',
      );
    }
  }

  bool _isAllowedEditorUri(Uri uri) {
    if (uri.host.isEmpty) return false;
    if (uri.scheme == 'https') return true;
    return widget.allowInsecureLocalhost &&
        uri.scheme == 'http' &&
        <String>{'localhost', '127.0.0.1', '::1'}.contains(uri.host);
  }

  void _handleError(Object error, StackTrace stackTrace) {
    if (mounted) setState(() => _status = DisNoteEditorStatus.failed);
    widget.onError?.call(error, stackTrace);
  }

  void _retry() => setState(() {
    _status = DisNoteEditorStatus.loading;
    _generation += 1;
  });
}

final class _DefaultLoadingOverlay extends StatelessWidget {
  const _DefaultLoadingOverlay({required this.messages});
  final DisNoteMessages messages;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: Theme.of(context).colorScheme.surface,
    child: Center(
      child: Semantics(
        liveRegion: true,
        label: messages.loadingEditor,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const CircularProgressIndicator.adaptive(),
            const SizedBox(height: 12),
            Text(messages.loadingEditor),
          ],
        ),
      ),
    ),
  );
}

final class _DefaultErrorOverlay extends StatelessWidget {
  const _DefaultErrorOverlay({required this.messages, required this.onRetry});
  final DisNoteMessages messages;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: Theme.of(context).colorScheme.surface,
    child: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.error_outline,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 8),
            Text(messages.editorUnavailable, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.tonal(onPressed: onRetry, child: Text(messages.retry)),
          ],
        ),
      ),
    ),
  );
}
