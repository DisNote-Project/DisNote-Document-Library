import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'bridge.dart';
import 'errors.dart';
import 'model.dart';

final class DisNoteEditorPlatformView extends StatefulWidget {
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
  State<DisNoteEditorPlatformView> createState() =>
      _DisNoteEditorPlatformViewState();
}

final class _DisNoteEditorPlatformViewState
    extends State<DisNoteEditorPlatformView> {
  late final WebViewController _controller;
  bool _ready = false;
  String? _lastDocumentJson;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('DisNoteFlutter', onMessageReceived: _onMessage)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: _onNavigation,
          onPageStarted: (_) => _ready = false,
          onPageFinished: (_) async {
            try {
              await _controller.runJavaScript(
                DisNoteFlutterBridgeScript.install,
              );
            } on Object catch (error, stackTrace) {
              widget.onError(error, stackTrace);
            }
          },
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame != false) {
              widget.onError(
                DisNoteBridgeException(
                  'editor resource failed: ${error.errorCode}',
                ),
                StackTrace.current,
              );
            }
          },
        ),
      )
      ..loadRequest(widget.editorUri);
  }

  @override
  void didUpdateWidget(covariant DisNoteEditorPlatformView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.editorUri != widget.editorUri) {
      _ready = false;
      _controller.loadRequest(widget.editorUri);
      return;
    }
    if (!_ready) return;
    if (oldWidget.editable != widget.editable) {
      _send(DisNoteSetEditable(widget.editable));
    }
    if (oldWidget.locale != widget.locale ||
        _documentJson(widget.document) != _lastDocumentJson) {
      _initialize();
    }
  }

  @override
  Widget build(BuildContext context) => Semantics(
    label: widget.editorTitle,
    child: WebViewWidget(controller: _controller),
  );

  NavigationDecision _onNavigation(NavigationRequest request) {
    final Uri? uri = Uri.tryParse(request.url);
    if (uri != null && widget.allowedOrigins.contains(uri.origin)) {
      return NavigationDecision.navigate;
    }
    if (uri != null) widget.onNavigationBlocked?.call(uri);
    return NavigationDecision.prevent;
  }

  void _onMessage(JavaScriptMessage event) {
    try {
      final DisNoteEditorMessage message = DisNoteEditorMessage.parse(
        event.message,
      );
      switch (message) {
        case DisNoteEditorReady():
          _ready = true;
          _initialize();
          widget.onReady();
          break;
        case DisNoteEditorDocument(:final document):
          if (_ready && widget.editable && document.id == widget.document.id) {
            _lastDocumentJson = _documentJson(document);
            widget.onDocumentChanged(document);
          }
          break;
      }
    } on Object catch (error, stackTrace) {
      widget.onError(error, stackTrace);
    }
  }

  void _initialize() {
    _lastDocumentJson = _documentJson(widget.document);
    _send(
      DisNoteInitializeEditor(
        widget.document,
        editable: widget.editable,
        locale: widget.locale,
      ),
    );
  }

  Future<void> _send(DisNoteEditorCommand command) async {
    try {
      await _controller.runJavaScript(command.toJavaScript());
    } on Object catch (error, stackTrace) {
      widget.onError(error, stackTrace);
    }
  }
}

String _documentJson(DisNoteDocument document) => jsonEncode(document.toJson());
