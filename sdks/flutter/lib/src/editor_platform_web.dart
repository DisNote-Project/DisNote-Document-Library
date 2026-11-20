import 'dart:convert';
import 'dart:js_interop';
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

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
  static int _nextViewId = 0;

  late final String _viewType;
  late final web.HTMLIFrameElement _iframe;
  late final JSFunction _messageListener;
  bool _ready = false;
  String? _lastDocumentJson;

  @override
  void initState() {
    super.initState();
    _viewType = 'disnote-editor-${_nextViewId++}';
    _iframe = web.HTMLIFrameElement()
      ..src = widget.editorUri.toString()
      ..title = widget.editorTitle
      ..referrerPolicy = 'strict-origin-when-cross-origin'
      ..setAttribute('allow', 'clipboard-read; clipboard-write')
      ..setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
      )
      ..style.border = '0'
      ..style.width = '100%'
      ..style.height = '100%';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (_) => _iframe);
    _messageListener = ((web.Event event) {
      if (event.isA<web.MessageEvent>()) {
        _onMessage(event as web.MessageEvent);
      }
    }).toJS;
    web.window.addEventListener('message', _messageListener);
    _iframe.addEventListener(
      'error',
      ((web.Event _) {
        widget.onError(
          const DisNoteBridgeException('editor iframe failed to load'),
          StackTrace.current,
        );
      }).toJS,
    );
  }

  @override
  void didUpdateWidget(covariant DisNoteEditorPlatformView oldWidget) {
    super.didUpdateWidget(oldWidget);
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
  void dispose() {
    web.window.removeEventListener('message', _messageListener);
    _iframe.remove();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);

  void _onMessage(web.MessageEvent event) {
    if (!widget.allowedOrigins.contains(event.origin) ||
        event.source != _iframe.contentWindow) {
      return;
    }
    final Object? data = event.data.dartify();
    if (data is! String) return;
    try {
      final DisNoteEditorMessage message = DisNoteEditorMessage.parse(data);
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

  void _send(DisNoteEditorCommand command) {
    try {
      _iframe.contentWindow?.postMessage(
        jsonEncode(command.toJson()).toJS,
        widget.editorUri.origin.toJS,
      );
    } on Object catch (error, stackTrace) {
      widget.onError(error, stackTrace);
    }
  }
}

String _documentJson(DisNoteDocument document) => jsonEncode(document.toJson());
